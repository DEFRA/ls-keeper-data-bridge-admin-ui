import { apiRequest, apiUploadRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'
import { getFlash, setFlash } from '../common/helpers/flash.js'
import { Readable } from 'node:stream'

const HISTORY_PAGE_SIZE = 10

/**
 * Where a run discovers its files. `internal` is the CDP folder the upload form writes into;
 * `external` is the IBM bucket the legacy sync reads from, configured as
 * `StorageConfiguration.ExternalStorage` on the backend.
 */
export const SOURCE_TYPES = ['internal', 'external']

/**
 * The upload endpoint writes into the internal source folder, so a run started straight after an
 * upload has to discover that folder.
 */
const UPLOAD_SOURCE_TYPE = 'internal'

/**
 * Normalises a submitted source type, falling back to the upload folder for anything unknown.
 *
 * @param {string} [sourceType] - Submitted source type
 * @returns {string}
 */
export function resolveSourceType(sourceType) {
  const value = sourceType?.trim().toLowerCase()

  return SOURCE_TYPES.includes(value) ? value : UPLOAD_SOURCE_TYPE
}

const TERMINAL_STATUSES = ['Succeeded', 'Failed', 'Rejected', 'Purged']

/**
 * The stages the backend purge endpoint accepts, in pipeline order. A purge cascades downstream:
 * purging `snapshots` also clears `staging` and `views`, because those artefacts are timestamp-keyed
 * and would otherwise be reused while holding the deleted snapshots' data.
 */
export const PURGE_STAGES = [
  'all',
  'inbound',
  'raw',
  'normalised',
  'optimised',
  'snapshots',
  'staging',
  'views'
]

const breadcrumbs = [
  { text: 'Home', href: '/' },
  { text: 'ETL', href: '/etl' }
]

// ─── Shared helpers ───────────────────────────────────────

/**
 * Whether a run has finished, and so is not worth polling again.
 *
 * @param {string} [status] - Import status
 * @returns {boolean}
 */
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status)
}

/**
 * GOV.UK tag colour for an import status.
 *
 * @param {string} [status] - Import status
 * @returns {string}
 */
export function statusTagClass(status) {
  switch (status) {
    case 'Succeeded':
      return 'govuk-tag--green'
    case 'Failed':
      return 'govuk-tag--red'
    case 'Rejected':
      return 'govuk-tag--orange'
    case 'Running':
      return 'govuk-tag--blue'
    case 'Queued':
      return 'govuk-tag--yellow'
    case 'Purged':
      return 'govuk-tag--purple'
    default:
      return 'govuk-tag--grey'
  }
}

/**
 * Summary-list rows for the structured detail the backend stores beside a failed import's error
 * message. Every field is optional - a failure only reports what the failing code actually knew -
 * so only populated fields produce a row.
 *
 * @param {object} [detail] - errorDetail from the import status or summary response
 * @returns {object[]} govukSummaryList rows
 */
export function buildErrorDetailRows(detail) {
  if (!detail) return []

  return [
    ['Error type', detail.type],
    ['Stage', detail.stage],
    ['Dataset', detail.dataset],
    ['File', detail.fileKey],
    ['Record', detail.recordNumber],
    ['Expected', detail.expected],
    ['Actual', detail.actual]
  ]
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
    .map(([label, value]) => ({
      key: { text: label },
      value: { text: String(value) }
    }))
}

/**
 * One line naming where a failed run died - the dataset and the source file's basename - for the
 * history table, where the full detail lives a click away on the import page.
 *
 * @param {object} summary - Import summary from the list endpoint
 * @returns {string|null}
 */
export function buildFailureHint(summary) {
  const detail = summary?.errorDetail

  if (summary?.status !== 'Failed' || !detail) return null

  const fileName = detail.fileKey?.split('/').pop()

  return [detail.dataset, fileName].filter(Boolean).join(' — ') || null
}

/**
 * One line saying what a purge removed, for the history table: the object count and the stages it
 * cascaded to. Purge records sit in the same history as imports; this is their counterpart to the
 * failure hint.
 *
 * @param {object} summary - Import summary from the list endpoint
 * @returns {string|null}
 */
export function buildPurgeHint(summary) {
  const purge = summary?.purge

  if (summary?.status !== 'Purged' || !purge) return null

  return [
    `${purge.deletedCount ?? 0} object(s)`,
    purge.stages?.length ? purge.stages.join(', ') : null
  ]
    .filter(Boolean)
    .join(' — ')
}

/**
 * View model for a single import.
 *
 * Discovery looks at the timestamp in the source filename, so a stale or future-dated file is
 * skipped and the run still succeeds. That reads as a pass but is not one, hence
 * `noSourceFilesWarning`.
 *
 * @param {object} [status] - Import status response from the backend
 * @returns {object|null}
 */
export function buildImportView(status) {
  if (!status) return null

  const datasets = status.datasets ?? []
  const sourceFileCount = datasets.reduce(
    (total, dataset) => total + (dataset.sourceFiles?.length ?? 0),
    0
  )

  return {
    ...status,
    datasets,
    stages: status.stages ?? [],
    tagClass: statusTagClass(status.status),
    isTerminal: isTerminal(status.status),
    sourceFileCount,
    errorDetailRows: buildErrorDetailRows(status.errorDetail),
    purgeRows: buildPurgeRows(status.purge),
    noSourceFilesWarning:
      status.status === 'Succeeded' && sourceFileCount === 0,
    canDownload: status.status === 'Succeeded' && Boolean(status.duckDbPath)
  }
}

/**
 * Summary-list rows for what a purge removed, mirroring {@link buildErrorDetailRows} for failures.
 *
 * @param {object} [purge] - purge detail from the import status response
 * @returns {object[]} govukSummaryList rows
 */
export function buildPurgeRows(purge) {
  if (!purge) return []

  return [
    ['Stages purged', purge.stages?.length ? purge.stages.join(', ') : null],
    ['Objects deleted', purge.deletedCount]
  ]
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
    .map(([label, value]) => ({
      key: { text: label },
      value: { text: String(value) }
    }))
}

/**
 * View model for a row in the history table.
 *
 * @param {object} summary - Import summary from the list endpoint
 * @returns {object}
 */
export function buildImportSummaryView(summary) {
  return {
    ...summary,
    tagClass: statusTagClass(summary.status),
    failureHint: buildFailureHint(summary),
    purgeHint: buildPurgeHint(summary),
    noSourceFilesWarning:
      summary.status === 'Succeeded' && !summary.sourceFileCount
  }
}

/**
 * Rejects a filename the backend will reject anyway, or that will fail at the decrypt stage.
 *
 * Decryption uses the filename as the password, so a renamed file cannot be decrypted however
 * valid its contents. Catching it here saves a five-minute run that was never going to work.
 *
 * @param {string} [filename] - Uploaded filename
 * @returns {string|null} Error message, or null when the name is usable
 */
export function validateSourceFilename(filename) {
  const name = filename?.trim()

  if (!name) return 'Select a file to upload'

  if (name.includes('/') || name.includes('\\')) {
    return 'The filename must not contain a path'
  }

  if (!name.toLowerCase().endsWith('.csv')) {
    return 'The file must be a .csv source file'
  }

  return null
}

function jsonResponse(h, result, successCode = 200) {
  return h
    .response(result.data ?? { error: 'No response data' })
    .code(result.ok ? successCode : result.status || 500)
    .type('application/json')
}

async function startImport(dataset, sourceType, rebuild = false) {
  // The parameter is only sent when asked for, so a normal start is byte-for-byte the request it
  // always was and a rebuild is visible in the URL.
  const searchParams = { sourceType, dataset }

  if (rebuild) {
    searchParams.rebuild = 'true'
  }

  return apiRequest('/api/etl/imports', {
    method: 'POST',
    searchParams
  })
}

// ─── Page controllers ─────────────────────────────────────

/**
 * ETL page — upload a source file, start a run, and see recent runs.
 */
export const etlDashboardController = {
  async handler(request, h) {
    const page = request.query.page ?? 1
    const skip = pageToSkip(page, HISTORY_PAGE_SIZE)

    const [importsResult, datasetsResult] = await Promise.all([
      apiRequest('/api/etl/imports', {
        searchParams: { skip, top: HISTORY_PAGE_SIZE }
      }),
      apiRequest('/api/etl/datasets')
    ])

    const imports = (importsResult.data?.imports ?? []).map(
      buildImportSummaryView
    )
    const totalCount = importsResult.data?.totalCount ?? imports.length

    return h.view('etl/index', {
      pageTitle: 'ETL Pipeline',
      heading: 'ETL pipeline',
      breadcrumbs,
      imports,
      datasets: datasetsResult.data?.datasets ?? [],
      sourceType: UPLOAD_SOURCE_TYPE,
      sourceTypes: SOURCE_TYPES,
      purgeStages: PURGE_STAGES,
      flash: getFlash(request),
      pagination: buildPagination(skip, HISTORY_PAGE_SIZE, totalCount, '/etl'),
      apiError: !importsResult.ok
        ? (importsResult.data?.message ?? 'Failed to load ETL imports')
        : null,
      datasetsError: !datasetsResult.ok
        ? (datasetsResult.data?.message ?? 'Failed to load datasets')
        : null
    })
  }
}

/**
 * Status of a single run, polled in place by the client until it finishes.
 */
export const etlImportDetailController = {
  async handler(request, h) {
    const { importId } = request.params

    const result = await apiRequest(
      `/api/etl/imports/${encodeURIComponent(importId)}`
    )

    if (!result.ok) {
      return h.view('etl/detail', {
        pageTitle: 'Import not found',
        heading: 'ETL import',
        breadcrumbs: [...breadcrumbs, { text: 'Import' }],
        apiError: result.data?.message ?? 'Import not found',
        etlImport: null
      })
    }

    const etlImport = buildImportView(result.data)

    return h.view('etl/detail', {
      pageTitle: `Import ${importId.substring(0, 8)}`,
      heading: 'ETL import',
      breadcrumbs: [...breadcrumbs, { text: importId.substring(0, 8) }],
      etlImport,
      flash: getFlash(request),
      initialData: JSON.stringify({ etlImport })
    })
  }
}

// ─── Form POST controllers ────────────────────────────────

/**
 * Upload an encrypted source file into the internal source folder, optionally starting a run once
 * it is in place.
 */
export const etlUploadController = {
  options: {
    payload: {
      parse: true,
      multipart: { output: 'stream' },
      maxBytes: 104857600
    }
  },
  async handler(request, h) {
    const { file, dataset, startAfterUpload } = request.payload ?? {}

    const objectKey = file?.hapi?.filename?.trim()
    const validationError = validateSourceFilename(objectKey)

    if (validationError) {
      setFlash(request, validationError, { type: 'error', title: 'Error' })
      return h.redirect('/etl')
    }

    const uploadResult = await apiUploadRequest(
      '/api/externalcatalogue/upload',
      file,
      objectKey
    )

    if (!uploadResult.ok) {
      setFlash(request, uploadResult.data?.message ?? 'Upload failed', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/etl')
    }

    if (startAfterUpload !== 'true') {
      setFlash(
        request,
        `Uploaded "${objectKey}". Start an import to process it.`
      )
      return h.redirect('/etl')
    }

    const startResult = await startImport(dataset, UPLOAD_SOURCE_TYPE)

    if (startResult.status === 202 && startResult.data?.importId) {
      setFlash(request, `Uploaded "${objectKey}" and started an import.`)
      return h.redirect(`/etl/imports/${startResult.data.importId}`)
    }

    setFlash(
      request,
      `Uploaded "${objectKey}", but the import did not start: ${startResult.data?.message ?? 'unknown error'}`,
      { type: 'error', title: 'Error' }
    )

    return h.redirect(redirectForFailedStart(startResult))
  }
}

/**
 * Start a run over whatever is already in the chosen source folder.
 */
export const etlStartImportController = {
  async handler(request, h) {
    const {
      dataset,
      sourceType: requestedSourceType,
      rebuild
    } = request.payload ?? {}
    const sourceType = resolveSourceType(requestedSourceType)
    const rebuilding = rebuild === 'true'

    const result = await startImport(dataset, sourceType, rebuilding)

    if (result.status === 202 && result.data?.importId) {
      setFlash(
        request,
        rebuilding
          ? `ETL rebuild started against the ${sourceType} source. Every stage was cleared first, so this run takes considerably longer than usual.`
          : `ETL import started against the ${sourceType} source.`
      )
      return h.redirect(`/etl/imports/${result.data.importId}`)
    }

    setFlash(request, result.data?.message ?? 'Failed to start the import', {
      type: 'error',
      title: 'Error'
    })

    return h.redirect(redirectForFailedStart(result))
  }
}

/**
 * A conflict names the run already in flight, which is the one worth watching.
 *
 * @param {object} result - Result of the start request
 * @returns {string}
 */
function redirectForFailedStart(result) {
  const inFlightImportId = result.data?.inFlightImportId

  return inFlightImportId ? `/etl/imports/${inFlightImportId}` : '/etl'
}

/**
 * Purge interstitial ETL storage: deletes the chosen stage for the chosen dataset (or all of them),
 * and everything the pipeline derives downstream of it. Destructive and not reversible, so the form
 * asks for explicit confirmation and the backend refuses while an import is running.
 */
export const etlPurgeController = {
  async handler(request, h) {
    const {
      dataset,
      stage,
      sourceType: requestedSourceType,
      confirm
    } = request.payload ?? {}

    const requestedStage = stage?.trim().toLowerCase()

    if (!PURGE_STAGES.includes(requestedStage)) {
      setFlash(request, 'Select what to purge.', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/etl')
    }

    if (confirm !== 'true') {
      setFlash(request, 'Confirm the purge to continue.', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/etl')
    }

    const result = await apiRequest('/api/etl/storage', {
      method: 'DELETE',
      searchParams: {
        dataset: dataset?.trim() || 'all',
        stage: requestedStage,
        sourceType: resolveSourceType(requestedSourceType)
      }
    })

    if (result.ok) {
      setFlash(
        request,
        result.data?.message ??
          `Purged ${result.data?.deletedCount ?? 0} object(s) from stage storage.`
      )
      return h.redirect('/etl')
    }

    setFlash(request, result.data?.message ?? 'The purge failed', {
      type: 'error',
      title: 'Error'
    })

    // A conflict names the import holding the pipeline, which is the one worth watching.
    const inFlightImportId = result.data?.inFlightImportId
    return h.redirect(
      result.status === 409 && inFlightImportId
        ? `/etl/imports/${inFlightImportId}`
        : '/etl'
    )
  }
}

/**
 * Download the latest staging database by following the backend's presigned URL.
 */
export const etlDuckDbDownloadController = {
  async handler(request, h) {
    const result = await apiRequest('/api/etl/staging/duckdb/latest')

    if (!result.ok || !result.data?.downloadUrl) {
      setFlash(
        request,
        result.data?.message ?? 'No staging database is available to download',
        { type: 'error', title: 'Error' }
      )
      return h.redirect('/etl')
    }

    return h.redirect(result.data.downloadUrl)
  }
}

/**
 * Download the newest parquet snapshot of a dataset by fetching the backend's presigned URL and
 * streaming the result. The file has to stream through here rather than redirect the browser to
 * S3: this control is reached by a form submission, and the CSP form-action policy applies to the
 * whole redirect chain, so a 302 to the S3 host is refused.
 */
export const etlParquetDownloadController = {
  async handler(request, h) {
    const dataset = request.query.dataset?.trim()

    if (!dataset) {
      setFlash(request, 'Select a dataset to download', {
        type: 'error',
        title: 'Error'
      })
      return h.redirect('/etl')
    }

    const result = await apiRequest(
      `/api/etl/staging/snapshots/${encodeURIComponent(dataset)}/latest`
    )

    if (!result.ok || !result.data?.downloadUrl) {
      setFlash(
        request,
        result.data?.message ?? 'No parquet snapshot is available to download',
        { type: 'error', title: 'Error' }
      )
      return h.redirect('/etl')
    }

    try {
      const response = await fetch(result.data.downloadUrl)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch parquet snapshot: ${response.status} ${response.statusText}`
        )
      }

      let filename = 'snapshot.parquet'
      if (result.data.objectKey) {
        const parts = result.data.objectKey.split('/')
        filename = parts[parts.length - 1]
      }

      // Readable.fromWeb converts the native Web Stream to a Node stream for Hapi
      return h
        .response(Readable.fromWeb(response.body))
        .type('application/vnd.apache.parquet')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        )
    } catch {
      setFlash(
        request,
        'The parquet snapshot could not be downloaded. Try again later.',
        { type: 'error', title: 'Error' }
      )
      return h.redirect('/etl')
    }
  }
}

/**
 * Download the latest SQLite database by fetching the backend's presigned URL and streaming the result.
 */
export const etlSqliteDownloadController = {
  async handler(request, h) {
    const result = await apiRequest('/api/etl/staging/sqlite/latest')

    if (!result.ok || !result.data?.downloadUrl) {
      setFlash(
        request,
        result.status === 404
          ? 'No SQLite database is available to download'
          : 'The SQLite database could not be downloaded. Try again later.',
        { type: 'error', title: 'Error' }
      )
      return h.redirect('/etl')
    }

    try {
      const response = await fetch(result.data.downloadUrl)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch SQLite file: ${response.status} ${response.statusText}`
        )
      }

      // Extract filename from objectKey or use a default
      let filename = 'database.sqlite'
      if (result.data.objectKey) {
        const parts = result.data.objectKey.split('/')
        filename = parts[parts.length - 1]
      }

      // Readable.fromWeb converts the native Web Stream to a Node stream for Hapi
      return h
        .response(Readable.fromWeb(response.body))
        .type('application/vnd.sqlite3')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        )
    } catch (error) {
      setFlash(
        request,
        'The SQLite database could not be downloaded. Try again later.',
        { type: 'error', title: 'Error' }
      )
      return h.redirect('/etl')
    }
  }
}

// ─── JSON passthrough for client-side polling ─────────────

/**
 * Status as JSON, so the page can poll without the browser ever holding a backend API key.
 */
export const apiGetEtlImportController = {
  async handler(request, h) {
    const { importId } = request.params

    const result = await apiRequest(
      `/api/etl/imports/${encodeURIComponent(importId)}`
    )

    if (!result.ok) {
      return jsonResponse(h, result)
    }

    return h
      .response(buildImportView(result.data))
      .code(200)
      .type('application/json')
  }
}
