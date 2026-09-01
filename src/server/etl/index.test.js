import { vi } from 'vitest'

const apiRequest = vi.fn()
const apiUploadRequest = vi.fn()

vi.mock('../common/helpers/api-client.js', () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiUploadRequest: (...args) => apiUploadRequest(...args)
}))

process.env.ADMIN_PASSWORD = 'test-password'
process.env.LOG_FORMAT = 'pino-pretty'

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
  })

  async function authenticatedCookie() {
    const response = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: 'test-password',
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
