import { apiRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'

const HISTORY_PAGE_SIZE = 10

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Cleanse', href: '/cleanse' }
]

// ─── Shared helper ────────────────────────────────────────

function jsonResponse(h, result, successCode = 200) {
  if (result.status === 204) {
    return h.response().code(204)
  }
  return h
    .response(result.data ?? { error: 'No response data' })
    .code(result.ok ? successCode : result.status || 500)
    .type('application/json')
}

// ─── Page Controllers ─────────────────────────────────────

/**
 * Main cleanse analysis dashboard.
 */
export const cleanseDashboardController = {
  async handler(request, h) {
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, HISTORY_PAGE_SIZE)

    const [latestResult, historyResult, policiesResult] = await Promise.all([
      apiRequest('/api/cleanse/runs', { searchParams: { skip: 0, top: 1 } }),
      apiRequest('/api/cleanse/runs', {
        searchParams: { skip, top: HISTORY_PAGE_SIZE }
      }),
      apiRequest('/api/throttle-policies')
    ])

    const latestRuns = latestResult.data?.runs ?? []
    const activeRun =
      latestRuns.find(
        (r) => r.status === 'Running' || r.status === 'Cancelling'
      ) ?? null

    const historyData = historyResult.data ?? {}
    const runs = historyData.runs ?? []
    const totalCount = historyData.count ?? runs.length

    const policies = Array.isArray(policiesResult.data)
      ? policiesResult.data
      : []
    const activePolicy = policies.find((p) => p.isActive) ?? null

    return h.view('cleanse/dashboard', {
      pageTitle: 'Cleanse Analysis',
      heading: 'Cleanse Analysis',
      breadcrumbs,
      activeRun,
      runs,
      policies,
      activePolicy,
      flash: getFlash(request),
      pagination: buildPagination(
        skip,
        HISTORY_PAGE_SIZE,
        totalCount,
        '/cleanse'
      ),
      apiError: !historyResult.ok
        ? (historyResult.data?.message ?? 'Failed to load runs')
        : null,
      initialData: JSON.stringify({ activeRun, policies, activePolicy })
    })
  }
}

/**
 * Cleanse run detail.
 */
export const cleanseRunDetailController = {
  async handler(request, h) {
    const { operationId } = request.params

    const result = await apiRequest(
      `/api/cleanse/run/${encodeURIComponent(operationId)}`
    )

    if (!result.ok) {
      return h.view('cleanse/detail', {
        pageTitle: 'Run not found',
        heading: 'Analysis run detail',
        breadcrumbs: [...breadcrumbs, { text: 'Detail' }],
        apiError: result.data?.message ?? 'Run not found',
        run: null
      })
    }

    return h.view('cleanse/detail', {
      pageTitle: `Run ${operationId.substring(0, 8)}`,
      heading: 'Analysis run detail',
      breadcrumbs: [...breadcrumbs, { text: operationId.substring(0, 8) }],
      run: result.data
    })
  }
}

// ─── Form POST Controllers (redirect-based) ──────────────

export const startAnalysisController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/start-analysis', {
      method: 'POST'
    })

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to start analysis', {
        type: 'error',
        title: 'Error'
      })
    } else {
      const operationId = result.data?.operationId ?? 'unknown'
      setFlash(request, `Analysis started. Operation ID: ${operationId}`)
    }

    return h.redirect('/cleanse')
  }
}

export const deleteDataController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/delete-data', {
      method: 'POST'
    })

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to delete data', {
        type: 'error',
        title: 'Error'
      })
    } else {
      const count = result.data?.deletedCount ?? 0
      setFlash(
        request,
        `Cleanse data deleted successfully. ${count} records removed.`
      )
    }

    return h.redirect('/cleanse')
  }
}

export const deleteMetadataController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/delete-metadata', {
      method: 'POST'
    })

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to delete metadata', {
        type: 'error',
        title: 'Error'
      })
    } else {
      const count = result.data?.deletedCount ?? 0
      setFlash(
        request,
        `Cleanse metadata deleted successfully. ${count} records removed.`
      )
    }

    return h.redirect('/cleanse')
  }
}

export const regenerateUrlController = {
  async handler(request, h) {
    const { operationId } = request.params

    const result = await apiRequest(
      `/api/cleanse/run/${encodeURIComponent(operationId)}/regenerate-url`,
      { method: 'POST' }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to regenerate URL', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, 'Report URL regenerated successfully.')
    }

    return h.redirect(`/cleanse/run/${encodeURIComponent(operationId)}`)
  }
}

export const testNotificationController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/test-notification', {
      method: 'POST'
    })

    if (!result.ok) {
      setFlash(
        request,
        result.data?.message ?? 'Failed to send test notification',
        { type: 'error', title: 'Error' }
      )
    } else {
      setFlash(
        request,
        `Test notification sent to ${result.data?.recipient ?? 'test@example.com'}.`
      )
    }

    return h.redirect('/cleanse')
  }
}

// ─── JSON API Proxy Controllers ───────────────────────────
// Called by client-side JavaScript for real-time polling.

export const apiGetRunsController = {
  async handler(request, h) {
    const { skip = 0, top = 10 } = request.query
    const result = await apiRequest('/api/cleanse/runs', {
      searchParams: { skip, top }
    })
    return jsonResponse(h, result)
  }
}

export const apiGetRunController = {
  async handler(request, h) {
    const { operationId } = request.params
    const result = await apiRequest(
      `/api/cleanse/run/${encodeURIComponent(operationId)}`
    )
    return jsonResponse(h, result)
  }
}

export const apiStartAnalysisController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/start-analysis', {
      method: 'POST'
    })
    return jsonResponse(h, result, 202)
  }
}

export const apiCancelAnalysisController = {
  async handler(request, h) {
    const result = await apiRequest('/api/cleanse/cancel-analysis', {
      method: 'POST'
    })
    return jsonResponse(h, result)
  }
}

export const apiGetPoliciesController = {
  async handler(request, h) {
    const result = await apiRequest('/api/throttle-policies')
    return jsonResponse(h, result)
  }
}

export const apiActivatePolicyController = {
  async handler(request, h) {
    const { slug } = request.params
    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}/activate`,
      { method: 'POST' }
    )
    return jsonResponse(h, result)
  }
}

export const apiRegenerateUrlController = {
  async handler(request, h) {
    const { operationId } = request.params
    const result = await apiRequest(
      `/api/cleanse/run/${encodeURIComponent(operationId)}/regenerate-url`,
      { method: 'POST' }
    )
    return jsonResponse(h, result)
  }
}
