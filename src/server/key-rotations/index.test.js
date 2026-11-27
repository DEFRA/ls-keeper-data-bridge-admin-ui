import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'

const apiRequest = vi.fn()
const testAdminPassword = randomUUID()

vi.mock('../common/helpers/api-client.js', () => ({
  apiRequest: (...args) => apiRequest(...args)
}))

vi.stubEnv('ADMIN_PASSWORD', testAdminPassword)
vi.stubEnv('LOG_FORMAT', 'pino-pretty')

const { createServer } = await import('../server.js')

describe('Key rotations page', () => {
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
        redirect: '/key-rotations'
      }
    })

    const setCookie = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'][0]
      : response.headers['set-cookie']

    return setCookie.split(';')[0]
  }

  async function getPage(url = '/key-rotations') {
    return server.inject({
      method: 'GET',
      url,
      headers: { cookie: await authenticatedCookie() }
    })
  }

  test('Should require authentication', async () => {
    const response = await server.inject('/key-rotations')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/auth/login?redirect=%2Fkey-rotations'
    )
  })

  test('Should list key rotations from the backend', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        items: [
          {
            id: 'rot-2',
            rotatedAtUtc: '2026-11-20T03:00:05Z',
            fileKey: 'keys/bucket-access-key.csv',
            fileHash: 'abc123',
            keyIdHint: 'AKI***XYZ',
            source: 'Automatic',
            status: 'Active',
            rolledBackFromId: null
          },
          {
            id: 'rot-1',
            rotatedAtUtc: '2026-10-01T09:15:00Z',
            fileKey: null,
            fileHash: null,
            keyIdHint: 'AKI***ABC',
            source: 'Manual',
            status: 'Superseded',
            rolledBackFromId: null
          }
        ],
        page: 1,
        pageSize: 20,
        totalCount: 2
      }
    })

    const response = await getPage()

    expect(response.statusCode).toBe(200)
    expect(apiRequest).toHaveBeenCalledWith('/api/key-rotations', {
      searchParams: { page: 1, pageSize: 20 }
    })
    expect(response.result).toContain('External storage key rotations')
    expect(response.result).toContain('20 Nov 2026 03:00:05')
    expect(response.result).toContain('AKI***XYZ')
    expect(response.result).toContain('keys/bucket-access-key.csv')
    expect(response.result).toContain('Automatic')
    expect(response.result).toContain('Superseded')
    expect(response.result).not.toContain('govuk-pagination')
  })

  test('Should request the page from the query string and paginate', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        items: [
          {
            id: 'rot-21',
            rotatedAtUtc: '2026-01-01T03:00:00Z',
            keyIdHint: 'AKI***OLD',
            source: 'Rollback',
            status: 'Superseded',
            rolledBackFromId: 'rot-3'
          }
        ],
        page: 2,
        pageSize: 20,
        totalCount: 41
      }
    })

    const response = await getPage('/key-rotations?page=2')

    expect(apiRequest).toHaveBeenCalledWith('/api/key-rotations', {
      searchParams: { page: 2, pageSize: 20 }
    })
    expect(response.result).toContain('Page 2 of 3')
    expect(response.result).toContain('href="/key-rotations?page=1"')
    expect(response.result).toContain('href="/key-rotations?page=3"')
    expect(response.result).toContain('rot-3')
  })

  test('Should show an empty state when there are no rotations', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], page: 1, pageSize: 20, totalCount: 0 }
    })

    const response = await getPage()

    expect(response.result).toContain('No key rotations have been recorded.')
  })

  test('Should show the backend error when the request fails', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 503,
      data: { message: 'Backend unavailable' }
    })

    const response = await getPage()

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('There is a problem')
    expect(response.result).toContain('Backend unavailable')
  })
})
