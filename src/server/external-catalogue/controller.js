import { apiRequest, apiUploadRequest } from '../common/helpers/api-client.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'External Catalogue', href: '/external-catalogue' }
]

/**
 * External catalogue main page - file listing + upload form.
 */
export const externalCatalogueController = {
  handler(request, h) {
    return h.view('external-catalogue/index', {
      pageTitle: 'External Catalogue',
      heading: 'External catalogue',
      breadcrumbs,
      flash: getFlash(request)
    })
  }
}

/**
 * Get files report - POST to query, display results.
 */
export const filesReportController = {
  async handler(request, h) {
    const { sourceType, days } = request.payload ?? {}

    if (!sourceType || !days) {
      return h.view('external-catalogue/index', {
        pageTitle: 'External Catalogue',
        heading: 'External catalogue',
        breadcrumbs,
        error: 'Select a source type and enter the number of days',
        formValues: request.payload
      })
    }

    const result = await apiRequest('/api/externalcatalogue/files', {
      searchParams: { sourceType, days }
    })

    return h.view('external-catalogue/index', {
      pageTitle: 'External Catalogue',
      heading: 'External catalogue',
      breadcrumbs,
      flash: getFlash(request),
      filesReport: result.ok ? result.data : null,
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to load file report')
        : null,
      formValues: request.payload
    })
  }
}

/**
 * Upload a CSV file - POST multipart.
 */
export const uploadFileController = {
  options: {
    payload: {
      parse: true,
      multipart: { output: 'stream' },
      maxBytes: 104857600
    }
  },
  async handler(request, h) {
    const { objectKey, file } = request.payload ?? {}

    if (!objectKey?.trim() || !file) {
      setFlash(request, 'Provide both a filename and a file', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/external-catalogue')
    }

    const result = await apiUploadRequest(
      '/api/externalcatalogue/upload',
      file,
      objectKey.trim()
    )

    if (!result.ok) {
      setFlash(request, result.data?.message ?? 'Upload failed', {
        type: 'error',
        title: 'Error'
      })
    } else {
      setFlash(
        request,
        result.data?.message ??
          `File "${objectKey}" uploaded (${result.data?.size ?? 0} bytes).`
      )
    }

    return h.redirect('/external-catalogue')
  }
}
