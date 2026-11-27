import { keyRotationsController } from './controller.js'

export const keyRotations = {
  plugin: {
    name: 'key-rotations',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/key-rotations',
          ...keyRotationsController
        }
      ])
    }
  }
}
