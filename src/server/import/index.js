import {
  importListController,
  importDetailController,
  importFilesController,
  startImportGetController,
  startImportPostController,
  lineageController,
  importAdminController,
  generateRecordIdFormController,
  generateRecordIdController,
  deleteCollectionController,
  deleteAllCollectionsController,
  deleteReportingCollectionController,
  deleteAllReportingCollectionsController,
  clearInternalStorageController
} from './controller.js'

export const imports = {
  plugin: {
    name: 'imports',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/import',
          ...importListController
        },
        {
          method: 'GET',
          path: '/import/start',
          ...startImportGetController
        },
        {
          method: 'POST',
          path: '/import/start',
          ...startImportPostController
        },
        {
          method: 'GET',
          path: '/import/admin',
          ...importAdminController
        },
        {
          method: 'GET',
          path: '/import/admin/generate-record-id',
          ...generateRecordIdFormController
        },
        {
          method: 'POST',
          path: '/import/admin/generate-record-id',
          ...generateRecordIdController
        },
        {
          method: 'POST',
          path: '/import/admin/delete-collection',
          ...deleteCollectionController
        },
        {
          method: 'POST',
          path: '/import/admin/delete-all-collections',
          ...deleteAllCollectionsController
        },
        {
          method: 'POST',
          path: '/import/admin/delete-reporting-collection',
          ...deleteReportingCollectionController
        },
        {
          method: 'POST',
          path: '/import/admin/delete-all-reporting-collections',
          ...deleteAllReportingCollectionsController
        },
        {
          method: 'POST',
          path: '/import/admin/clear-internal-storage',
          ...clearInternalStorageController
        },
        {
          method: 'GET',
          path: '/import/{importId}',
          ...importDetailController
        },
        {
          method: 'GET',
          path: '/import/{importId}/files',
          ...importFilesController
        },
        {
          method: 'GET',
          path: '/import/lineage/{collectionName}/{recordId}',
          ...lineageController
        }
      ])
    }
  }
}
