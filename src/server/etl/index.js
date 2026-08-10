import {
  etlDashboardController,
  etlImportDetailController,
  etlUploadController,
  etlStartImportController,
  etlDuckDbDownloadController,
  apiGetEtlImportController
} from './controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const etl = {
  plugin: {
    name: 'etl',
    register(server) {
      server.route([
        // ── Page routes ──
        {
          method: 'GET',
          path: '/etl',
          ...etlDashboardController
        },
        {
          method: 'GET',
          path: '/etl/imports/{importId}',
          ...etlImportDetailController
        },

        // ── Form POST routes (redirect-based) ──
        {
          method: 'POST',
          path: '/etl/upload',
          options: etlUploadController.options,
          handler: etlUploadController.handler
        },
        {
          method: 'POST',
          path: '/etl/start',
          ...etlStartImportController
        },

        // ── Download ──
        {
          method: 'GET',
          path: '/etl/duckdb/latest',
          ...etlDuckDbDownloadController
        },

        // ── JSON API proxy route (for client-side polling) ──
        {
          method: 'GET',
          path: '/etl/api/imports/{importId}',
          ...apiGetEtlImportController
        }
      ])
    }
  }
}

export { etl }
