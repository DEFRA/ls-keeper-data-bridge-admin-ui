import {
  externalCatalogueController,
  filesReportController,
  uploadFileController
} from './controller.js'

const externalCatalogue = {
  plugin: {
    name: 'externalCatalogue',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/external-catalogue',
          ...externalCatalogueController
        },
        {
          method: 'POST',
          path: '/external-catalogue/files',
          ...filesReportController
        },
        {
          method: 'POST',
          path: '/external-catalogue/upload',
          options: uploadFileController.options,
          handler: uploadFileController.handler
        }
      ])
    }
  }
}

export { externalCatalogue }
