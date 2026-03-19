import { apiRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'

const PAGE_SIZE = 10

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Cleanse Export', href: '/cleanse-export' }
]

/**
 * List export operations - paginated.
 */
export const exportListController = {
  async handler(request, h) {
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, PAGE_SIZE)

    const result = await apiRequest('/api/cleanse-export', {
      searchParams: { skip, top: PAGE_SIZE }
    })

    const data = result.data ?? {}
    const exports = data.exports ?? []
    const totalCount = data.count ?? exports.length

    return h.view('cleanse-export/list', {
      pageTitle: 'Cleanse Export',
      heading: 'Cleanse export',
      breadcrumbs,
      exports,
      flash: getFlash(request),
      pagination: buildPagination(
        skip,
        PAGE_SIZE,
        totalCount,
        '/cleanse-export'
      ),
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to load exports')
        : null
    })
  }
}

/**
 * Export detail.
 */
export const exportDetailController = {
  async handler(request, h) {
    const { exportId } = request.params

    const result = await apiRequest(
      `/api/cleanse-export/${encodeURIComponent(exportId)}`
    )

    if (!result.ok) {
      return h.view('cleanse-export/detail', {
        pageTitle: 'Export not found',
        heading: 'Export detail',
        breadcrumbs: [...breadcrumbs, { text: 'Detail' }],
        apiError: result.data?.message ?? 'Export not found',
        export: null
      })
    }

    return h.view('cleanse-export/detail', {
      pageTitle: `Export ${exportId.substring(0, 8)}`,
      heading: 'Export detail',
      breadcrumbs: [...breadcrumbs, { text: exportId.substring(0, 8) }],
      export: result.data,
      flash: getFlash(request)
    })
  }
}

/**
 * Start export - POST.
 */
export const startExportController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse-export/start', {
      method: 'POST'
    })

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to start export', {
        type: 'error',
        title: 'Error'
      })
    } else {
      const exportId = result.data?.exportId ?? 'unknown'
      setFlash(request, `Export started. Export ID: ${exportId}`)
    }

    return h.redirect('/cleanse-export')
  }
}

/**
 * Regenerate export URL - POST.
 */
export const regenerateExportUrlController = {
  async handler(request, h) {
    const { exportId } = request.params

    const result = await apiRequest(
      `/api/cleanse-export/${encodeURIComponent(exportId)}/regenerate-url`,
      { method: 'POST' }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to regenerate URL', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, 'Export report URL regenerated successfully.')
    }

    return h.redirect(`/cleanse-export/${encodeURIComponent(exportId)}`)
  }
}
