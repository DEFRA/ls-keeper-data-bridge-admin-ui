import { apiRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'

const PAGE_SIZE = 20

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'Imports', href: '/import' }
]

/**
 * List imports - paginated.
 */
export const importListController = {
  async handler(request, h) {
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, PAGE_SIZE)

    const result = await apiRequest('/api/import', {
      searchParams: { skip, top: PAGE_SIZE }
    })

    const data = result.data ?? {}
    const imports = data.imports ?? []
    const totalCount = data.count ?? imports.length

    return h.view('import/list', {
      pageTitle: 'Imports',
      heading: 'Imports',
      breadcrumbs,
      imports,
      flash: getFlash(request),
      pagination: buildPagination(skip, PAGE_SIZE, totalCount, '/import'),
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to load imports')
        : null
    })
  }
}

/**
 * Import detail.
 */
export const importDetailController = {
  async handler(request, h) {
    const { importId } = request.params

    const result = await apiRequest(
      `/api/import/${encodeURIComponent(importId)}`
    )

    if (!result.ok) {
      return h.view('import/detail', {
        pageTitle: 'Import not found',
        heading: 'Import detail',
        breadcrumbs: [...breadcrumbs, { text: 'Detail' }],
        apiError: result.data?.message ?? 'Import not found',
        import: null
      })
    }

    return h.view('import/detail', {
      pageTitle: `Import ${importId}`,
      heading: 'Import detail',
      breadcrumbs: [...breadcrumbs, { text: importId.substring(0, 8) }],
      import: result.data
    })
  }
}

/**
 * Import file reports.
 */
export const importFilesController = {
  async handler(request, h) {
    const { importId } = request.params

    const result = await apiRequest(
      `/api/import/${encodeURIComponent(importId)}/files`
    )

    if (!result.ok) {
      return h.view('import/files', {
        pageTitle: 'Import files',
        heading: 'File reports',
        breadcrumbs: [
          ...breadcrumbs,
          { text: importId.substring(0, 8), href: `/import/${importId}` },
          { text: 'Files' }
        ],
        apiError: result.data?.message ?? 'Files not found',
        files: []
      })
    }

    return h.view('import/files', {
      pageTitle: `Files - Import ${importId}`,
      heading: 'File processing reports',
      breadcrumbs: [
        ...breadcrumbs,
        { text: importId.substring(0, 8), href: `/import/${importId}` },
        { text: 'Files' }
      ],
      importId,
      files: result.data?.files ?? []
    })
  }
}

/**
 * Start import - GET shows form.
 */
export const startImportGetController = {
  handler(_request, h) {
    return h.view('import/start', {
      pageTitle: 'Start import',
      heading: 'Start a new import',
      breadcrumbs: [...breadcrumbs, { text: 'Start import' }]
    })
  }
}

/**
 * Start import - POST triggers import.
 */
export const startImportPostController = {
  async handler(request, h) {
    const { sourceType } = request.payload ?? {}

    if (!sourceType) {
      return h.view('import/start', {
        pageTitle: 'Start import',
        heading: 'Start a new import',
        breadcrumbs: [...breadcrumbs, { text: 'Start import' }],
        error: 'Select a source type'
      })
    }

    const result = await apiRequest('/api/import/start', {
      method: 'POST',
      searchParams: { sourceType }
    })

    if (!result.ok) {
      return h.view('import/start', {
        pageTitle: 'Start import',
        heading: 'Start a new import',
        breadcrumbs: [...breadcrumbs, { text: 'Start import' }],
        error: result.data?.message ?? 'Failed to start import',
        sourceType
      })
    }

    setFlash(
      request,
      `Import started successfully. Import ID: ${result.data?.importId}`
    )
    return h.redirect('/import')
  }
}

/**
 * Record lineage - paginated.
 */
export const lineageController = {
  async handler(request, h) {
    const { collectionName, recordId } = request.params
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, PAGE_SIZE)

    const result = await apiRequest(
      `/api/import/lineage/${encodeURIComponent(collectionName)}/${encodeURIComponent(recordId)}`,
      { searchParams: { skip, top: PAGE_SIZE } }
    )

    const data = result.data ?? {}
    const events = data.events ?? []
    const totalCount = data.count ?? events.length

    return h.view('import/lineage', {
      pageTitle: `Lineage - ${collectionName}`,
      heading: 'Record lineage',
      breadcrumbs: [...breadcrumbs, { text: 'Lineage' }],
      collectionName,
      recordId,
      events,
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to load lineage')
        : null,
      pagination: buildPagination(
        skip,
        PAGE_SIZE,
        totalCount,
        `/import/lineage/${collectionName}/${recordId}`
      )
    })
  }
}

/**
 * Import admin page - GET shows admin operations.
 */
export const importAdminController = {
  handler(request, h) {
    return h.view('import/admin', {
      pageTitle: 'Import Admin',
      heading: 'Import administration',
      breadcrumbs: [...breadcrumbs, { text: 'Admin' }],
      flash: getFlash(request)
    })
  }
}

/**
 * Generate record ID - POST.
 */
export const generateRecordIdController = {
  async handler(request, h) {
    const { keyParts: rawKeyParts } = request.payload ?? {}

    if (!rawKeyParts || !rawKeyParts.trim()) {
      return h.view('import/generate-record-id', {
        pageTitle: 'Generate Record ID',
        heading: 'Generate record ID',
        breadcrumbs: [
          ...breadcrumbs,
          { text: 'Admin', href: '/import/admin' },
          { text: 'Generate ID' }
        ],
        error: 'Enter at least one key part'
      })
    }

    const keyParts = rawKeyParts
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

    const result = await apiRequest('/api/import/generate-record-id', {
      method: 'POST',
      body: { keyParts }
    })

    if (!result.ok) {
      return h.view('import/generate-record-id', {
        pageTitle: 'Generate Record ID',
        heading: 'Generate record ID',
        breadcrumbs: [
          ...breadcrumbs,
          { text: 'Admin', href: '/import/admin' },
          { text: 'Generate ID' }
        ],
        error: result.data?.message ?? 'Failed to generate record ID',
        keyPartsInput: rawKeyParts
      })
    }

    return h.view('import/generate-record-id', {
      pageTitle: 'Generate Record ID',
      heading: 'Generate record ID',
      breadcrumbs: [
        ...breadcrumbs,
        { text: 'Admin', href: '/import/admin' },
        { text: 'Generate ID' }
      ],
      result: result.data,
      keyPartsInput: rawKeyParts
    })
  }
}

/**
 * Generate record ID form - GET.
 */
export const generateRecordIdFormController = {
  handler(_request, h) {
    return h.view('import/generate-record-id', {
      pageTitle: 'Generate Record ID',
      heading: 'Generate record ID',
      breadcrumbs: [
        ...breadcrumbs,
        { text: 'Admin', href: '/import/admin' },
        { text: 'Generate ID' }
      ]
    })
  }
}

/**
 * Delete collection - POST.
 */
export const deleteCollectionController = {
  async handler(request, h) {
    const { collectionName } = request.payload ?? {}

    if (!collectionName?.trim()) {
      setFlash(request, 'Enter a collection name', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/import/admin')
    }

    const result = await apiRequest(
      `/api/import/collections/${encodeURIComponent(collectionName.trim())}`,
      { method: 'DELETE' }
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to delete collection', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(
        request,
        result.data?.message ?? `Collection "${collectionName}" deleted.`
      )
    }

    return h.redirect('/import/admin')
  }
}

/**
 * Delete all collections - POST.
 */
export const deleteAllCollectionsController = {
  async handler(request, h) {
    const result = await apiRequest('/api/import/collections', {
      method: 'DELETE'
    })

    if (!result.ok) {
      setFlash(
        request,
        result.data?.message ?? 'Failed to delete collections',
        { type: 'error', title: 'Error' }
      )
    } else {
      setFlash(
        request,
        result.data?.message ??
          `Deleted ${result.data?.totalCount ?? 0} collections.`
      )
    }

    return h.redirect('/import/admin')
  }
}

/**
 * Delete reporting collection - POST.
 */
export const deleteReportingCollectionController = {
  async handler(request, h) {
    const { collectionName } = request.payload ?? {}

    if (!collectionName?.trim()) {
      setFlash(request, 'Enter a collection name', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/import/admin')
    }

    const result = await apiRequest(
      `/api/import/reporting-collections/${encodeURIComponent(collectionName.trim())}`,
      { method: 'DELETE' }
    )

    if (!result.ok) {
      setFlash(
        request,
        result.data?.message ?? 'Failed to delete reporting collection',
        { type: 'error', title: 'Error' }
      )
    } else {
      setFlash(
        request,
        result.data?.message ??
          `Reporting collection "${collectionName}" deleted.`
      )
    }

    return h.redirect('/import/admin')
  }
}

/**
 * Delete all reporting collections - POST.
 */
export const deleteAllReportingCollectionsController = {
  async handler(request, h) {
    const result = await apiRequest('/api/import/reporting-collections', {
      method: 'DELETE'
    })

    if (!result.ok) {
      setFlash(
        request,
        result.data?.message ?? 'Failed to delete reporting collections',
        { type: 'error', title: 'Error' }
      )
    } else {
      setFlash(
        request,
        result.data?.message ??
          `Deleted ${result.data?.totalCount ?? 0} reporting collections.`
      )
    }

    return h.redirect('/import/admin')
  }
}

/**
 * Clear internal storage - POST.
 */
export const clearInternalStorageController = {
  async handler(request, h) {
    const { sourceType } = request.payload ?? {}

    const result = await apiRequest('/api/import/internal-storage', {
      method: 'DELETE',
      searchParams: sourceType ? { sourceType } : {}
    })

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Failed to clear storage', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(
        request,
        result.data?.message ??
          `Deleted ${result.data?.totalDeleted ?? 0} objects from storage.`
      )
    }

    return h.redirect('/import/admin')
  }
}
