import { apiRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'
import { getAuth } from '../auth/auth.js'

const PAGE_SIZE = 20

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Issues', href: '/issues' }
]

// Allowed filter query parameters
const FILTER_PARAMS = [
  'ctsLidFullIdentifier',
  'cph',
  'issueCode',
  'ruleCode',
  'errorCode',
  'isActive',
  'isIgnored',
  'resolutionStatus',
  'assignedTo',
  'isUnassigned',
  'sortBy',
  'sortDescending'
]

/**
 * Extracts filter params from query string.
 */
function extractFilters(query) {
  const filters = {}
  for (const key of FILTER_PARAMS) {
    if (query[key] !== undefined && query[key] !== '') {
      filters[key] = query[key]
    }
  }
  return filters
}

/**
 * List issues - paginated and filterable.
 */
export const issuesListController = {
  async handler(request, h) {
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, PAGE_SIZE)
    const filters = extractFilters(request.query)

    const result = await apiRequest('/api/cleanse/issues', {
      searchParams: { skip, top: PAGE_SIZE, ...filters }
    })

    const data = result.data ?? {}
    const issues = data.issues ?? []
    const totalCount = data.totalCount ?? data.count ?? issues.length

    // Build query string for pagination links (preserving filters)
    const queryParams = { ...filters }

    return h.view('issues/list', {
      pageTitle: 'Issues',
      heading: 'Cleanse issues',
      breadcrumbs,
      issues,
      filters,
      totalCount,
      flash: getFlash(request),
      pagination: buildPagination(
        skip,
        PAGE_SIZE,
        totalCount,
        '/issues',
        queryParams
      ),
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to load issues')
        : null
    })
  }
}

/**
 * Issue detail with history.
 */
export const issueDetailController = {
  async handler(request, h) {
    const { issueId } = request.params
    const historyPage = request.query.historyPage ?? 1
    const historySkip = pageToSkip(historyPage, PAGE_SIZE)

    // Fetch history
    const historyResult = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/history`,
      { searchParams: { skip: historySkip, top: PAGE_SIZE } }
    )

    // Since there's no single-issue endpoint, we need to find the issue in the list.
    // We'll do a targeted search by looking through the paginated results.
    // This is a limitation of the API.
    let issue = null

    // Try to find the issue by fetching with a large enough window
    // and filtering client-side. This is not ideal but necessary
    // given the API design.
    const searchResult = await apiRequest('/api/cleanse/issues', {
      searchParams: { skip: 0, top: 100 }
    })

    if (searchResult.ok && searchResult.data?.issues) {
      issue = searchResult.data.issues.find((i) => i.id === issueId) ?? null
    }

    const historyData = historyResult.data ?? {}
    const entries = historyData.entries ?? []
    const historyCount = historyData.count ?? entries.length

    if (!issue) {
      return h.view('issues/detail', {
        pageTitle: 'Issue not found',
        heading: 'Issue detail',
        breadcrumbs: [...breadcrumbs, { text: 'Detail' }],
        apiError: 'Issue not found',
        issue: null,
        history: [],
        historyPagination: null
      })
    }

    return h.view('issues/detail', {
      pageTitle: `Issue ${issueId.substring(0, 8)}`,
      heading: 'Issue detail',
      breadcrumbs: [...breadcrumbs, { text: issueId.substring(0, 8) }],
      issue,
      history: entries,
      historyPagination: buildPagination(
        historySkip,
        PAGE_SIZE,
        historyCount,
        `/issues/${issueId}`,
        { historyPage: '' }
      ),
      flash: getFlash(request),
      auth: getAuth(request)
    })
  }
}

/**
 * Assign issue - POST.
 */
export const assignIssueController = {
  async handler(request, h) {
    const { issueId } = request.params
    const { assignedTo } = request.payload ?? {}
    const auth = getAuth(request)

    if (!assignedTo) {
      setFlash(request, 'Enter a username to assign', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect(`/issues/${issueId}`)
    }

    const result = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/assign`,
      {
        method: 'POST',
        body: {
          assignedTo,
          performedBy: auth?.username ?? 'admin'
        }
      }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to assign issue', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, `Issue assigned to ${assignedTo}.`)
    }

    return h.redirect(`/issues/${issueId}`)
  }
}

/**
 * Unassign issue - POST.
 */
export const unassignIssueController = {
  async handler(request, h) {
    const { issueId } = request.params
    const auth = getAuth(request)

    const result = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/unassign`,
      {
        method: 'POST',
        body: {
          performedBy: auth?.username ?? 'admin'
        }
      }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to unassign issue', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, 'Issue unassigned.')
    }

    return h.redirect(`/issues/${issueId}`)
  }
}

/**
 * Ignore issue - POST.
 */
export const ignoreIssueController = {
  async handler(request, h) {
    const { issueId } = request.params
    const auth = getAuth(request)

    const result = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/ignore`,
      {
        method: 'POST',
        body: {
          performedBy: auth?.username ?? 'admin'
        }
      }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to ignore issue', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, 'Issue marked as ignored.')
    }

    return h.redirect(`/issues/${issueId}`)
  }
}

/**
 * Unignore issue - POST.
 */
export const unignoreIssueController = {
  async handler(request, h) {
    const { issueId } = request.params
    const auth = getAuth(request)

    const result = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/unignore`,
      {
        method: 'POST',
        body: {
          performedBy: auth?.username ?? 'admin'
        }
      }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to unignore issue', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, 'Issue ignore flag removed.')
    }

    return h.redirect(`/issues/${issueId}`)
  }
}

/**
 * Update resolution status - POST.
 */
export const updateResolutionStatusController = {
  async handler(request, h) {
    const { issueId } = request.params
    const { status } = request.payload ?? {}
    const auth = getAuth(request)

    if (!status) {
      setFlash(request, 'Select a resolution status', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect(`/issues/${issueId}`)
    }

    const result = await apiRequest(
      `/api/cleanse/issues/${encodeURIComponent(issueId)}/resolution-status`,
      {
        method: 'POST',
        body: {
          status,
          performedBy: auth?.username ?? 'admin'
        }
      }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to update status', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(request, `Resolution status updated to ${status}.`)
    }

    return h.redirect(`/issues/${issueId}`)
  }
}
