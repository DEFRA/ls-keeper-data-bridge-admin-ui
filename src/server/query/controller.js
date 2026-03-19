import { apiRequest } from '../common/helpers/api-client.js'

const DEFAULT_TOP = 20

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Query Data', href: '/query' }
]

/**
 * Query form - GET shows the form.
 */
export const queryFormController = {
  handler(_request, h) {
    return h.view('query/index', {
      pageTitle: 'Query Data',
      heading: 'Query data',
      breadcrumbs
    })
  }
}

/**
 * Query results - POST executes the query.
 */
export const queryResultsController = {
  async handler(request, h) {
    const { collectionName, $filter, $orderby, $select, $skip, $top } =
      request.payload ?? {}

    if (!collectionName) {
      return h.view('query/index', {
        pageTitle: 'Query Data',
        heading: 'Query data',
        breadcrumbs,
        error: 'Enter a collection name',
        formValues: request.payload
      })
    }

    const skip = parseInt($skip, 10) || 0
    const top = parseInt($top, 10) || DEFAULT_TOP

    const searchParams = {}
    if ($filter) searchParams.$filter = $filter
    if ($orderby) searchParams.$orderby = $orderby
    if ($select) searchParams.$select = $select
    searchParams.$skip = String(skip)
    searchParams.$top = String(top)

    const result = await apiRequest(
      `/api/query/${encodeURIComponent(collectionName)}`,
      { searchParams }
    )

    if (!result.ok) {
      return h.view('query/index', {
        pageTitle: 'Query Data',
        heading: 'Query data',
        breadcrumbs,
        error: result.data?.message ?? `Query failed (${result.status})`,
        formValues: request.payload
      })
    }

    // Extract from response envelope
    const envelope = result.data ?? {}
    const records = envelope.data ?? []
    const totalCount = envelope.totalCount ?? envelope.count ?? records.length
    const returnedCount = envelope.count ?? records.length

    // Extract column headers from first record, excluding _id
    const columns = []
    if (records.length > 0) {
      for (const key of Object.keys(records[0])) {
        if (key !== '_id' && !key.startsWith('@')) {
          columns.push(key)
        }
      }
    }

    // Build pagination
    const currentPage = Math.floor(skip / top) + 1
    const totalPages = Math.ceil(totalCount / top)
    const pagination = {
      currentPage,
      totalPages,
      totalCount,
      skip,
      top,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
      previousSkip: Math.max(0, skip - top),
      nextSkip: skip + top
    }

    return h.view('query/results', {
      pageTitle: `Query results - ${collectionName}`,
      heading: `Results: ${collectionName}`,
      breadcrumbs: [...breadcrumbs, { text: 'Results' }],
      collectionName,
      records,
      columns,
      returnedCount,
      totalCount,
      pagination,
      formValues: request.payload,
      rawJson: JSON.stringify(result.data, null, 2),
      envelope: {
        filter: envelope.filter,
        orderBy: envelope.orderBy,
        select: envelope.select,
        executedAtUtc: envelope.executedAtUtc
      }
    })
  }
}

/**
 * Record detail - GET shows a single record as key/value pairs.
 */
export const recordDetailController = {
  async handler(request, h) {
    const { collectionName, recordId } = request.params

    const result = await apiRequest(
      `/api/query/${encodeURIComponent(collectionName)}`,
      {
        searchParams: {
          $filter: `_id eq '${recordId}'`,
          $top: '1'
        }
      }
    )

    if (!result.ok) {
      return h.view('query/index', {
        pageTitle: 'Query Data',
        heading: 'Query data',
        breadcrumbs,
        error:
          result.data?.message ?? `Failed to load record (${result.status})`
      })
    }

    const envelope = result.data ?? {}
    const records = envelope.data ?? []

    if (records.length === 0) {
      return h.view('query/index', {
        pageTitle: 'Query Data',
        heading: 'Query data',
        breadcrumbs,
        error: 'Record not found'
      })
    }

    const record = records[0]

    // Build ordered list of fields, excluding internal/meta fields
    const fields = Object.entries(record)
      .filter(([key]) => !key.startsWith('@'))
      .map(([key, value]) => ({ key, value }))

    return h.view('query/record', {
      pageTitle: `Record - ${collectionName}`,
      heading: `Record detail`,
      breadcrumbs: [
        ...breadcrumbs,
        { text: 'Results', href: `/query` },
        { text: 'Record' }
      ],
      collectionName,
      recordId,
      record,
      fields
    })
  }
}
