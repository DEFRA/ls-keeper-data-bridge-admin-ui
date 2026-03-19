import {
  loginGetController,
  loginPostController,
  logoutController
} from './controller.js'

export const auth = {
  plugin: {
    name: 'auth',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/auth/login',
          ...loginGetController
        },
        {
          method: 'POST',
          path: '/auth/login',
          ...loginPostController
        },
        {
          method: 'GET',
          path: '/auth/logout',
          ...logoutController
        }
      ])
    }
  }
}
