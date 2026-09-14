import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'

const apiRequest = vi.fn()
const apiUploadRequest = vi.fn()
const testAdminPassword = randomUUID()

vi.mock('../common/helpers/api-client.js', () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiUploadRequest: (...args) => apiUploadRequest(...args)
}))

vi.stubEnv('ADMIN_PASSWORD', testAdminPassword)
vi.stubEnv('LOG_FORMAT', 'pino-pretty')

const { createServer } = await import('../server.js')

describe('ETL SQLite download route', () => {
  let server
  let originalFetch

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    apiRequest.mockReset()
    apiUploadRequest.mockReset()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.unstubAllEnvs()
  })

  async function authenticatedCookie() {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: testAdminPassword,
        redirect: '/etl'
      }
    })

    const setCookie = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'][0]
      : response.headers['set-cookie']

    return setCookie.split(';')[0]
  }

  test('Should require authentication', async () => {
    const response = await server.inject('/etl/sqlite/latest')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/auth/login?redirect=%2Fetl%2Fsqlite%2Flatest'
    )
  })

  test('Should show the SQLite download option on the ETL page', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/api/etl/imports') {
        return Promise.resolve({
          ok: true,
          status: 200,
          data: { imports: [], totalCount: 0 }
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        data: { datasets: [] }
      })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/etl',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('Download latest SQLite')
    expect(response.result).toContain('href="/etl/sqlite/latest"')
  })

  test('Should stream the SQLite attachment through the registered route', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        downloadUrl: 'https://s3.example/cphs.sqlite?sig',
        objectKey: 'views/cphs_123.sqlite'
      }
    })
    global.fetch.mockResolvedValue(
      new Response(Uint8Array.from([83, 81, 76, 105, 116, 101]))
    )

    const response = await server.inject({
      method: 'GET',
      url: '/etl/sqlite/latest',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.rawPayload.toString()).toBe('SQLite')
    expect(response.headers['content-type']).toContain(
      'application/vnd.sqlite3'
    )
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="cphs_123.sqlite"'
    )
    expect(response.headers['cache-control']).toContain('no-store')
  })
})

describe('ETL import detail', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    apiRequest.mockReset()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.unstubAllEnvs()
  })

  async function authenticatedCookie() {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: testAdminPassword,
        redirect: '/etl'
      }
    })

    const setCookie = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'][0]
      : response.headers['set-cookie']

    return setCookie.split(';')[0]
  }

  test('Should show the structured detail of a failed import', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        importId: 'failed-1',
        status: 'Failed',
        sourceType: 'internal',
        requestedAtUtc: '2026-09-14T10:00:00Z',
        error: "File 'litprd/LITP_CTSADDRESS_1.csv' failed H/C/D/T validation",
        errorDetail: {
          type: 'XsvValidationException',
          stage: 'Normalise',
          dataset: 'cts_addresses',
          fileKey: 'litprd/LITP_CTSADDRESS_1.csv',
          expected: '10',
          actual: '9'
        },
        stages: [],
        datasets: []
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: '/etl/imports/failed-1',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('The import failed')
    expect(response.result).toContain('XsvValidationException')
    expect(response.result).toContain('Normalise')
    expect(response.result).toContain('cts_addresses')
    expect(response.result).toContain('litprd/LITP_CTSADDRESS_1.csv')
    expect(response.result).toContain('Expected')
    expect(response.result).toContain('Actual')
  })

  test('Should render a failed import whose detail is sparse', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        importId: 'failed-2',
        status: 'Failed',
        requestedAtUtc: '2026-09-14T10:00:00Z',
        error: 'Something went wrong',
        errorDetail: { type: 'InvalidOperationException' },
        stages: [],
        datasets: []
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: '/etl/imports/failed-2',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('InvalidOperationException')
    expect(response.result).not.toContain('Record')
  })

  test('Should hint at the failed dataset and file in the history', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/api/etl/imports') {
        return Promise.resolve({
          ok: true,
          status: 200,
          data: {
            imports: [
              {
                importId: 'failed-1',
                status: 'Failed',
                sourceType: 'internal',
                sourceFileCount: 1,
                requestedAtUtc: '2026-09-14T10:00:00Z',
                errorDetail: {
                  dataset: 'cts_addresses',
                  fileKey: 'litprd/LITP_CTSADDRESS_1.csv'
                }
              }
            ],
            totalCount: 1
          }
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        data: { datasets: [] }
      })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/etl',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('cts_addresses — LITP_CTSADDRESS_1.csv')
  })
})

describe('ETL source selection', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    apiRequest.mockReset()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.unstubAllEnvs()
  })

  async function authenticatedCookie() {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: testAdminPassword,
        redirect: '/etl'
      }
    })

    const setCookie = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'][0]
      : response.headers['set-cookie']

    return setCookie.split(';')[0]
  }

  test('Should offer both sources on the start form and show each run source in the history', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/api/etl/imports') {
        return Promise.resolve({
          ok: true,
          status: 200,
          data: {
            imports: [
              {
                importId: 'ext-1',
                status: 'Succeeded',
                sourceType: 'external',
                sourceFileCount: 3,
                requestedAtUtc: '2026-08-11T10:00:00Z'
              }
            ],
            totalCount: 1
          }
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        data: { datasets: [] }
      })
    })

    const response = await server.inject({
      method: 'GET',
      url: '/etl',
      headers: { cookie: await authenticatedCookie() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('name="sourceType"')
    expect(response.result).toContain('value="internal"')
    expect(response.result).toContain('value="external"')
    expect(response.result).toContain('External S3 bucket')
    expect(response.result).toContain(
      '<td class="govuk-table__cell">external</td>'
    )
  })

  test('Should start a run against the external bucket through the registered route', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 202,
      data: { importId: 'ext-1', status: 'Queued' }
    })

    const response = await server.inject({
      method: 'POST',
      url: '/etl/start',
      headers: { cookie: await authenticatedCookie() },
      payload: { sourceType: 'external', dataset: 'sam_cph_holdings' }
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/etl/imports/ext-1')
    expect(apiRequest).toHaveBeenCalledWith('/api/etl/imports', {
      method: 'POST',
      searchParams: { sourceType: 'external', dataset: 'sam_cph_holdings' }
    })
  })
})
