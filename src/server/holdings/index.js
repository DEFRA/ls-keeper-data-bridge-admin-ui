import {
  holdingsSearchController,
  ctsHoldingController,
  samHoldingController
} from './controller.js'

const holdings = {
  plugin: {
    name: 'holdings',
    register(server) {
      server.route([
        { method: 'GET', path: '/holdings', ...holdingsSearchController },
        {
          method: 'GET',
          path: '/holdings/cts/{lidFullIdentifier*}',
          ...ctsHoldingController
        },
        { method: 'GET', path: '/holdings/sam/{cph*}', ...samHoldingController }
      ])
    }
  }
}

export { holdings }
