import {
  cleanseDashboardController,
  cleanseRunDetailController,
  cleanseRunReportController,
  startAnalysisController,
  deleteDataController,
  deleteMetadataController,
  regenerateUrlController,
  testNotificationController,
  apiGetRunsController,
  apiGetRunController,
  apiStartAnalysisController,
  apiCancelAnalysisController,
  apiGetPoliciesController,
  apiActivatePolicyController,
  apiRegenerateUrlController
} from './controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const cleanse = {
  plugin: {
    name: 'cleanse',
    register(server) {
      server.route([
        // ── Page routes ──
        {
          method: 'GET',
          path: '/cleanse',
          ...cleanseDashboardController
        },
        {
          method: 'GET',
          path: '/cleanse/run/{operationId}',
          ...cleanseRunDetailController
        },
        {
          method: 'GET',
          path: '/cleanse/run/{operationId}/report',
          ...cleanseRunReportController
        },

        // ── Form POST routes (redirect-based) ──
        {
          method: 'POST',
          path: '/cleanse/start-analysis',
          ...startAnalysisController
        },
        {
          method: 'POST',
          path: '/cleanse/delete-data',
          ...deleteDataController
        },
        {
          method: 'POST',
          path: '/cleanse/delete-metadata',
          ...deleteMetadataController
        },
        {
          method: 'POST',
          path: '/cleanse/run/{operationId}/regenerate-url',
          ...regenerateUrlController
        },
        {
          method: 'POST',
          path: '/cleanse/test-notification',
          ...testNotificationController
        },

        // ── JSON API proxy routes (for client-side polling) ──
        {
          method: 'GET',
          path: '/cleanse/api/runs',
          ...apiGetRunsController
        },
        {
          method: 'GET',
          path: '/cleanse/api/run/{operationId}',
          ...apiGetRunController
        },
        {
          method: 'POST',
          path: '/cleanse/api/start',
          ...apiStartAnalysisController
        },
        {
          method: 'POST',
          path: '/cleanse/api/cancel',
          ...apiCancelAnalysisController
        },
        {
          method: 'GET',
          path: '/cleanse/api/policies',
          ...apiGetPoliciesController
        },
        {
          method: 'POST',
          path: '/cleanse/api/policies/{slug}/activate',
          ...apiActivatePolicyController
        },
        {
          method: 'POST',
          path: '/cleanse/api/run/{operationId}/regenerate-url',
          ...apiRegenerateUrlController
        }
      ])
    }
  }
}

export { cleanse }
