import {
  queryFormController,
  queryResultsController,
  recordDetailController
} from './controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const query = {
  plugin: {
    name: 'query',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/query',
          ...queryFormController
        },
        {
          method: 'POST',
          path: '/query',
          ...queryResultsController
        },
        {
          method: 'GET',
          path: '/query/{collectionName}/record/{recordId}',
          ...recordDetailController
        }
      ])
    }
  }
}

export { query }
