import { apiRequest } from '../common/helpers/api-client.js'
import { getFlash } from '../common/helpers/flash.js'

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Holdings', href: '/holdings' }
]

/**
 * Holdings search form.
 */
export const holdingsSearchController = {
  handler(request, h) {
    return h.view('holdings/search', {
      pageTitle: 'Holdings',
      heading: 'Holdings lookup',
      breadcrumbs,
      flash: getFlash(request)
    })
  }
}

/**
 * CTS CPH holding detail.
 *
 * Uses the generic /api/query endpoint instead of /api/holdings/cts/{lid}
 * because AWS API Gateway decodes percent-encoded slashes in path segments,
 * making it impossible to pass slash-containing identifiers as path params.
 */
export const ctsHoldingController = {
  async handler(request, h) {
    const lidFullIdentifier =
      request.params.lidFullIdentifier || request.query.lidFullIdentifier

    if (!lidFullIdentifier) {
      return h.redirect('/holdings')
    }

    // Redirect query-string form submissions to the clean path URL
    if (request.query.lidFullIdentifier) {
      return h.redirect(`/holdings/cts/${lidFullIdentifier}`)
    }

    const holdingResult = await apiRequest('/api/query/cts_cph_holding', {
      searchParams: {
        $filter: `LID_FULL_IDENTIFIER eq '${sanitiseODataValue(lidFullIdentifier)}'`,
        $top: '100'
      }
    })

    if (!holdingResult.ok || !holdingResult.data?.data?.length) {
      return h.view('holdings/cts-detail', {
        pageTitle: 'CTS Holding',
        heading: 'CTS holding detail',
        breadcrumbs: [...breadcrumbs, { text: 'CTS' }],
        apiError: holdingResult.data?.message ?? 'Holding not found',
        holding: null
      })
    }

    const holding = holdingResult.data.data[0]

    const keeperResult = await apiRequest('/api/query/cts_keeper', {
      searchParams: {
        $filter: `LID_FULL_IDENTIFIER eq '${sanitiseODataValue(lidFullIdentifier)}'`,
        $top: '100'
      }
    })

    const keepers = keeperResult.ok
      ? {
          data: keeperResult.data?.data ?? [],
          count: keeperResult.data?.totalCount ?? 0
        }
      : null

    return h.view('holdings/cts-detail', {
      pageTitle: `CTS Holding - ${lidFullIdentifier}`,
      heading: 'CTS holding detail',
      breadcrumbs: [...breadcrumbs, { text: lidFullIdentifier }],
      lidFullIdentifier,
      locationName: null,
      holding,
      keepers,
      holdingFields: buildFields(holding),
      timestamp: holding.UpdatedAtUtc ?? holding.CreatedAtUtc ?? null
    })
  }
}

/**
 * SAM CPH holding detail.
 *
 * Uses the generic /api/query endpoint instead of /api/holdings/sam/{cph}
 * because AWS API Gateway decodes percent-encoded slashes in path segments,
 * making it impossible to pass slash-containing CPH values as path params.
 */
export const samHoldingController = {
  async handler(request, h) {
    const cph = request.params.cph || request.query.cph

    if (!cph) {
      return h.redirect('/holdings')
    }

    // Redirect query-string form submissions to the clean path URL
    if (request.query.cph) {
      return h.redirect(`/holdings/sam/${cph}`)
    }

    const holdingResult = await apiRequest('/api/query/sam_cph_holdings', {
      searchParams: {
        $filter: `CPH eq '${sanitiseODataValue(cph)}'`,
        $top: '100'
      }
    })

    if (!holdingResult.ok || !holdingResult.data?.data?.length) {
      return h.view('holdings/sam-detail', {
        pageTitle: 'SAM Holding',
        heading: 'SAM holding detail',
        breadcrumbs: [...breadcrumbs, { text: 'SAM' }],
        apiError: holdingResult.data?.message ?? 'Holding not found',
        holding: null
      })
    }

    const holding = holdingResult.data.data[0]
    const safeCph = sanitiseODataValue(cph)

    // Fetch related data in parallel
    const [herdResult, holderResult] = await Promise.all([
      apiRequest('/api/query/sam_herd', {
        searchParams: {
          $filter: `startswith(CPHH,'${safeCph}')`,
          $top: '100'
        }
      }),
      apiRequest('/api/query/sam_cph_holder', {
        searchParams: {
          $filter: `CPHS eq '${safeCph}'`,
          $top: '100'
        }
      })
    ])

    const herd = herdResult.ok
      ? {
          data: herdResult.data?.data ?? [],
          count: herdResult.data?.totalCount ?? 0
        }
      : null
    const holders = holderResult.ok
      ? {
          data: holderResult.data?.data ?? [],
          count: holderResult.data?.totalCount ?? 0
        }
      : null

    return h.view('holdings/sam-detail', {
      pageTitle: `SAM Holding - ${cph}`,
      heading: 'SAM holding detail',
      breadcrumbs: [...breadcrumbs, { text: cph }],
      cph,
      locationName: null,
      holding,
      herd,
      parties: null,
      holders,
      holdingFields: buildFields(holding),
      timestamp: holding.UpdatedAtUtc ?? holding.CreatedAtUtc ?? null
    })
  }
}

/**
 * Convert a dynamic object into an ordered array of { key, value } pairs.
 */
function buildFields(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj)
    .filter(([key]) => !key.startsWith('@') && key !== '_id')
    .map(([key, value]) => ({ key, value }))
}

/**
 * Sanitise a value for use in an OData $filter string literal.
 * Escapes single-quotes by doubling them to prevent OData injection.
 */
function sanitiseODataValue(value) {
  return String(value).replace(/'/g, "''")
}
