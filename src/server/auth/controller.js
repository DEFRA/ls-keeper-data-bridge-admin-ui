import { config } from '../../config/config.js'
import { setAuth, clearAuth, isAuthenticated } from './auth.js'

const loginGetController = {
  handler(request, h) {
    if (isAuthenticated(request)) {
      return h.redirect('/')
    }

    const redirect = request.query.redirect ?? '/'
    const error = request.query.error ?? null

    return h.view('auth/login', {
      pageTitle: 'Sign in',
      heading: 'Sign in',
      redirect,
      error
    })
  }
}

const loginPostController = {
  handler(request, h) {
    const { username, password, redirect } = request.payload ?? {}
    const adminPassword = config.get('admin.password')
    const redirectTo = redirect || '/'

    if (username === 'admin' && password === adminPassword) {
      setAuth(request, username)
      return h.redirect(redirectTo)
    }

    return h.redirect(
      `/auth/login?error=invalid&redirect=${encodeURIComponent(redirectTo)}`
    )
  }
}

const logoutController = {
  handler(request, h) {
    clearAuth(request)
    return h.redirect('/auth/login')
  }
}

export { loginGetController, loginPostController, logoutController }
