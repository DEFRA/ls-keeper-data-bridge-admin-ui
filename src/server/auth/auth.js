/**
 * Auth helpers for simple admin authentication.
 * Stores auth state in the Hapi yar session.
 */

const AUTH_SESSION_KEY = 'auth'
const LOGIN_PATH = '/auth/login'

/**
 * Paths that do not require authentication.
 */
const PUBLIC_PATHS = [
  LOGIN_PATH,
  '/auth/login',
  '/health',
  '/public',
  '/favicon.ico'
]

/**
 * Check if a request path is public (no auth required).
 */
function isPublicPath(path) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
}

/**
 * Get the current auth state from session.
 */
export function getAuth(request) {
  try {
    return request.yar?.get(AUTH_SESSION_KEY) ?? null
  } catch {
    return null
  }
}

/**
 * Set authentication in session after successful login.
 */
export function setAuth(request, username) {
  request.yar.set(AUTH_SESSION_KEY, {
    authenticated: true,
    username,
    loginTime: new Date().toISOString()
  })
}

/**
 * Clear authentication from session (logout).
 */
export function clearAuth(request) {
  request.yar.clear(AUTH_SESSION_KEY)
}

/**
 * Check if the request is authenticated.
 */
export function isAuthenticated(request) {
  const auth = getAuth(request)
  return auth?.authenticated === true
}

/**
 * Hapi onPreHandler extension that redirects unauthenticated
 * requests to the login page.
 */
export const authMiddleware = {
  plugin: {
    name: 'auth-middleware',
    register(server) {
      server.ext('onPreHandler', (request, h) => {
        const { path } = request

        if (isPublicPath(path)) {
          return h.continue
        }

        if (!isAuthenticated(request)) {
          return h
            .redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(path)}`)
            .takeover()
        }

        return h.continue
      })
    }
  }
}
