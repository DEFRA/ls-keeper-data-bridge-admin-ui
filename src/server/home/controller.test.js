import { createServer } from '../server.js'

const REDIRECT = 302

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should redirect unauthenticated requests to login', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(REDIRECT)
    expect(headers.location).toContain('/auth/login')
  })
})
