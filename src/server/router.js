import inert from '@hapi/inert'

import { home } from './home/index.js'
import { health } from './health/index.js'
import { auth } from './auth/index.js'
import { imports } from './import/index.js'
import { cleanse } from './cleanse/index.js'
import { issues } from './issues/index.js'
import { query } from './query/index.js'
import { throttlePolicies } from './throttle-policies/index.js'
import { cleanseExport } from './cleanse-export/index.js'
import { holdings } from './holdings/index.js'
import { externalCatalogue } from './external-catalogue/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { authMiddleware } from './auth/auth.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Auth middleware - must be registered before routes
      await server.register([authMiddleware])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Auth routes (login/logout)
      await server.register([auth])

      // Application specific routes
      await server.register([
        home,
        imports,
        cleanse,
        issues,
        query,
        throttlePolicies,
        cleanseExport,
        holdings,
        externalCatalogue
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
