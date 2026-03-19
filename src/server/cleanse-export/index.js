import {
  exportListController,
  exportDetailController,
  startExportController,
  regenerateExportUrlController
} from './controller.js'

const cleanseExport = {
  plugin: {
    name: 'cleanseExport',
    register(server) {
      server.route([
        { method: 'GET', path: '/cleanse-export', ...exportListController },
        {
          method: 'GET',
          path: '/cleanse-export/{exportId}',
          ...exportDetailController
        },
        {
          method: 'POST',
          path: '/cleanse-export/start',
          ...startExportController
        },
        {
          method: 'POST',
          path: '/cleanse-export/{exportId}/regenerate-url',
          ...regenerateExportUrlController
        }
      ])
    }
  }
}

export { cleanseExport }
