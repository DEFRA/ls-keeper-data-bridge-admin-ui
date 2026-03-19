import { apiRequest } from '../common/helpers/api-client.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Throttle Policies', href: '/throttle-policies' }
]

/**
 * Normal-policy defaults used to pre-populate the Create form.
 */
const NORMAL_DEFAULTS = {
  ingestion: {
    batchSize: 500,
    batchDelayMs: 200,
    progressUpdateInterval: 500,
    logInterval: 500
  },
  cleanseAnalysis: {
    pumpBatchSize: 200,
    pumpDelayMs: 50,
    recordIssueDelayMs: 20,
    progressUpdateInterval: 200,
    rpmWindowSeconds: 60
  },
  cleanseExport: {
    streamBatchSize: 2000,
    throttlingDelayMs: 50,
    rpmWindowSeconds: 60
  },
  issueDeactivation: {
    batchSize: 1000,
    throttleDelayMs: 100,
    rpmWindowSeconds: 60
  },
  issueQuery: {
    streamBatchSize: 2000
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Parse an integer from form payload, returning undefined if blank.
 */
function parseIntOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? undefined : n
}

/**
 * Build a ThrottlePolicySettings object from a flat form payload.
 * Field names use dot-notation: `ingestion.batchSize`, etc.
 */
function buildSettingsFromPayload(payload) {
  return {
    ingestion: {
      batchSize: parseIntOrUndefined(payload['ingestion.batchSize']),
      batchDelayMs: parseIntOrUndefined(payload['ingestion.batchDelayMs']),
      progressUpdateInterval: parseIntOrUndefined(
        payload['ingestion.progressUpdateInterval']
      ),
      logInterval: parseIntOrUndefined(payload['ingestion.logInterval'])
    },
    cleanseAnalysis: {
      pumpBatchSize: parseIntOrUndefined(
        payload['cleanseAnalysis.pumpBatchSize']
      ),
      pumpDelayMs: parseIntOrUndefined(payload['cleanseAnalysis.pumpDelayMs']),
      recordIssueDelayMs: parseIntOrUndefined(
        payload['cleanseAnalysis.recordIssueDelayMs']
      ),
      progressUpdateInterval: parseIntOrUndefined(
        payload['cleanseAnalysis.progressUpdateInterval']
      ),
      rpmWindowSeconds: parseIntOrUndefined(
        payload['cleanseAnalysis.rpmWindowSeconds']
      )
    },
    cleanseExport: {
      streamBatchSize: parseIntOrUndefined(
        payload['cleanseExport.streamBatchSize']
      ),
      throttlingDelayMs: parseIntOrUndefined(
        payload['cleanseExport.throttlingDelayMs']
      ),
      rpmWindowSeconds: parseIntOrUndefined(
        payload['cleanseExport.rpmWindowSeconds']
      )
    },
    issueDeactivation: {
      batchSize: parseIntOrUndefined(payload['issueDeactivation.batchSize']),
      throttleDelayMs: parseIntOrUndefined(
        payload['issueDeactivation.throttleDelayMs']
      ),
      rpmWindowSeconds: parseIntOrUndefined(
        payload['issueDeactivation.rpmWindowSeconds']
      )
    },
    issueQuery: {
      streamBatchSize: parseIntOrUndefined(
        payload['issueQuery.streamBatchSize']
      )
    }
  }
}

/**
 * Flatten a ThrottlePolicySettings object for use in form value attributes.
 */
function flattenSettings(settings) {
  const s = settings ?? {}
  return {
    'ingestion.batchSize': s.ingestion?.batchSize ?? '',
    'ingestion.batchDelayMs': s.ingestion?.batchDelayMs ?? '',
    'ingestion.progressUpdateInterval':
      s.ingestion?.progressUpdateInterval ?? '',
    'ingestion.logInterval': s.ingestion?.logInterval ?? '',
    'cleanseAnalysis.pumpBatchSize': s.cleanseAnalysis?.pumpBatchSize ?? '',
    'cleanseAnalysis.pumpDelayMs': s.cleanseAnalysis?.pumpDelayMs ?? '',
    'cleanseAnalysis.recordIssueDelayMs':
      s.cleanseAnalysis?.recordIssueDelayMs ?? '',
    'cleanseAnalysis.progressUpdateInterval':
      s.cleanseAnalysis?.progressUpdateInterval ?? '',
    'cleanseAnalysis.rpmWindowSeconds':
      s.cleanseAnalysis?.rpmWindowSeconds ?? '',
    'cleanseExport.streamBatchSize': s.cleanseExport?.streamBatchSize ?? '',
    'cleanseExport.throttlingDelayMs': s.cleanseExport?.throttlingDelayMs ?? '',
    'cleanseExport.rpmWindowSeconds': s.cleanseExport?.rpmWindowSeconds ?? '',
    'issueDeactivation.batchSize': s.issueDeactivation?.batchSize ?? '',
    'issueDeactivation.throttleDelayMs':
      s.issueDeactivation?.throttleDelayMs ?? '',
    'issueDeactivation.rpmWindowSeconds':
      s.issueDeactivation?.rpmWindowSeconds ?? '',
    'issueQuery.streamBatchSize': s.issueQuery?.streamBatchSize ?? ''
  }
}

// ── Controllers ─────────────────────────────────────────────────────

/**
 * GET /throttle-policies — list all policies + active banner
 */
export const listPoliciesController = {
  async handler(request, h) {
    const [allResult, activeResult] = await Promise.all([
      apiRequest('/api/throttle-policies'),
      apiRequest('/api/throttle-policies/active')
    ])

    const policies = Array.isArray(allResult.data) ? allResult.data : []
    const activePolicy = activeResult.ok ? activeResult.data : null

    // Sort: Normal first, then active, then alphabetical
    policies.sort((a, b) => {
      if (a.isReadOnly) return -1
      if (b.isReadOnly) return 1
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })

    return h.view('throttle-policies/list', {
      pageTitle: 'Throttle Policies',
      heading: 'Throttle policies',
      breadcrumbs,
      policies,
      activePolicy,
      flash: getFlash(request),
      apiError: !allResult.ok
        ? (allResult.data?.error ?? 'Failed to load throttle policies')
        : null
    })
  }
}

/**
 * POST /throttle-policies/{slug}/activate — activate a policy
 */
export const activatePolicyController = {
  async handler(request, h) {
    const { slug } = request.params
    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}/activate`,
      { method: 'POST' }
    )

    if (result.ok) {
      setFlash(request, `Policy "${result.data?.name ?? slug}" activated.`)
    } else {
      setFlash(request, result.data?.error ?? 'Failed to activate policy.', {
        type: 'important',
        title: 'Error'
      })
    }

    return h.redirect('/throttle-policies')
  }
}

/**
 * POST /throttle-policies/deactivate — deactivate all (revert to Normal)
 */
export const deactivateAllController = {
  async handler(request, h) {
    const result = await apiRequest('/api/throttle-policies/deactivate', {
      method: 'POST'
    })

    if (result.ok || result.status === 204) {
      setFlash(
        request,
        'All policies deactivated. Normal defaults are now in effect.'
      )
    } else {
      setFlash(
        request,
        result.data?.error ?? 'Failed to deactivate policies.',
        {
          type: 'important',
          title: 'Error'
        }
      )
    }

    return h.redirect('/throttle-policies')
  }
}

/**
 * GET /throttle-policies/create — new-policy form
 */
export const createPolicyGetController = {
  handler(_request, h) {
    return h.view('throttle-policies/form', {
      pageTitle: 'Create Throttle Policy',
      heading: 'Create a new throttle policy',
      breadcrumbs: [...breadcrumbs, { text: 'Create' }],
      isEdit: false,
      formValues: {
        name: '',
        ...flattenSettings(NORMAL_DEFAULTS)
      }
    })
  }
}

/**
 * POST /throttle-policies/create — submit new policy
 */
export const createPolicyPostController = {
  async handler(request, h) {
    const payload = request.payload ?? {}

    const body = {
      name: (payload.name ?? '').trim(),
      settings: buildSettingsFromPayload(payload)
    }

    if (!body.name) {
      return h.view('throttle-policies/form', {
        pageTitle: 'Create Throttle Policy',
        heading: 'Create a new throttle policy',
        breadcrumbs: [...breadcrumbs, { text: 'Create' }],
        isEdit: false,
        error: 'Enter a policy name',
        formValues: payload
      })
    }

    const result = await apiRequest('/api/throttle-policies', {
      method: 'POST',
      body
    })

    if (result.ok) {
      setFlash(request, `Policy "${body.name}" created.`)
      return h.redirect('/throttle-policies')
    }

    return h.view('throttle-policies/form', {
      pageTitle: 'Create Throttle Policy',
      heading: 'Create a new throttle policy',
      breadcrumbs: [...breadcrumbs, { text: 'Create' }],
      isEdit: false,
      error: result.data?.error ?? `Failed to create policy (${result.status})`,
      formValues: payload
    })
  }
}

/**
 * GET /throttle-policies/{slug}/edit — edit-policy form
 */
export const editPolicyGetController = {
  async handler(request, h) {
    const { slug } = request.params

    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}`
    )

    if (!result.ok) {
      setFlash(request, result.data?.error ?? 'Policy not found.', {
        type: 'important',
        title: 'Error'
      })
      return h.redirect('/throttle-policies')
    }

    const policy = result.data

    return h.view('throttle-policies/form', {
      pageTitle: `Edit ${policy.name}`,
      heading: `Edit policy: ${policy.name}`,
      breadcrumbs: [...breadcrumbs, { text: 'Edit' }],
      isEdit: true,
      slug: policy.slug,
      formValues: {
        name: policy.name,
        ...flattenSettings(policy.settings)
      }
    })
  }
}

/**
 * POST /throttle-policies/{slug}/edit — submit policy edits
 */
export const editPolicyPostController = {
  async handler(request, h) {
    const { slug } = request.params
    const payload = request.payload ?? {}

    const body = {
      name: (payload.name ?? '').trim() || undefined,
      settings: buildSettingsFromPayload(payload)
    }

    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}`,
      { method: 'PUT', body }
    )

    if (result.ok) {
      setFlash(request, `Policy "${body.name ?? slug}" updated.`)
      return h.redirect('/throttle-policies')
    }

    return h.view('throttle-policies/form', {
      pageTitle: `Edit policy`,
      heading: `Edit policy: ${body.name ?? slug}`,
      breadcrumbs: [...breadcrumbs, { text: 'Edit' }],
      isEdit: true,
      slug,
      error: result.data?.error ?? `Failed to update policy (${result.status})`,
      formValues: payload
    })
  }
}

/**
 * GET /throttle-policies/{slug}/delete — confirm deletion page
 */
export const deletePolicyGetController = {
  async handler(request, h) {
    const { slug } = request.params

    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}`
    )

    if (!result.ok) {
      setFlash(request, result.data?.error ?? 'Policy not found.', {
        type: 'important',
        title: 'Error'
      })
      return h.redirect('/throttle-policies')
    }

    return h.view('throttle-policies/delete', {
      pageTitle: `Delete ${result.data.name}`,
      heading: `Delete policy`,
      breadcrumbs: [...breadcrumbs, { text: 'Delete' }],
      policy: result.data
    })
  }
}

/**
 * POST /throttle-policies/{slug}/delete — execute deletion
 */
export const deletePolicyPostController = {
  async handler(request, h) {
    const { slug } = request.params

    const result = await apiRequest(
      `/api/throttle-policies/${encodeURIComponent(slug)}`,
      { method: 'DELETE' }
    )

    if (result.ok || result.status === 204) {
      setFlash(request, `Policy "${slug}" deleted.`)
    } else if (result.status === 409) {
      setFlash(
        request,
        result.data?.error ??
          'Cannot delete an active policy. Deactivate it first.',
        { type: 'important', title: 'Error' }
      )
    } else {
      setFlash(
        request,
        result.data?.error ?? `Failed to delete policy (${result.status})`,
        {
          type: 'important',
          title: 'Error'
        }
      )
    }

    return h.redirect('/throttle-policies')
  }
}
