import { vi } from 'vitest'

const apiRequest = vi.fn()
const apiUploadRequest = vi.fn()

vi.mock('../common/helpers/api-client.js', () => ({
  apiRequest: (...args) => apiRequest(...args),
  apiUploadRequest: (...args) => apiUploadRequest(...args)
}))

const {
  isTerminal,
  statusTagClass,
  buildImportView,
  buildImportSummaryView,
  validateSourceFilename,
  etlDashboardController,
  etlStartImportController,
  etlUploadController,
  etlDuckDbDownloadController,
  etlSqliteDownloadController
} = await import('./controller.js')

// ── Test doubles ─────────────────────────────────────────

function mockRequest(options = {}) {
  return {
    query: {},
    params: {},
    payload: {},
    yar: { flash: vi.fn(() => []) },
    ...options
  }
}

function mockResponseToolkit() {
  return {
    view: vi.fn((template, context) => ({ template, context })),
    redirect: vi.fn((location) => ({ location })),
    response: vi.fn(() => ({
      code: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    }))
  }
}

function fileStream(filename) {
  return { hapi: { filename } }
}

beforeEach(() => {
  apiRequest.mockReset()
  apiUploadRequest.mockReset()
})

// ── Pure helpers ─────────────────────────────────────────

describe('#isTerminal', () => {
  test.each(['Succeeded', 'Failed', 'Rejected'])(
    'Should treat %s as finished',
    (status) => {
      expect(isTerminal(status)).toBe(true)
    }
  )

  test.each(['Queued', 'Running', undefined])(
    'Should treat %s as still in flight',
    (status) => {
      expect(isTerminal(status)).toBe(false)
    }
  )
})

describe('#statusTagClass', () => {
  test('Should colour each status distinctly', () => {
    expect(statusTagClass('Succeeded')).toBe('govuk-tag--green')
    expect(statusTagClass('Failed')).toBe('govuk-tag--red')
    expect(statusTagClass('Rejected')).toBe('govuk-tag--orange')
    expect(statusTagClass('Running')).toBe('govuk-tag--blue')
    expect(statusTagClass('Queued')).toBe('govuk-tag--yellow')
    expect(statusTagClass('Something else')).toBe('govuk-tag--grey')
  })
})

describe('#buildImportView', () => {
  test('Should count the source files across every dataset', () => {
    const view = buildImportView({
      status: 'Succeeded',
      duckDbPath: 'staging/keeper_data_bridge_20251113121333.duckdb',
      datasets: [
        { dataset: 'sam_cph_holdings', sourceFiles: [{ key: 'a.csv' }] },
        {
          dataset: 'cts_keepers',
          sourceFiles: [{ key: 'b.csv' }, { key: 'c.csv' }]
        }
      ]
    })

    expect(view.sourceFileCount).toBe(3)
    expect(view.noSourceFilesWarning).toBe(false)
    expect(view.canDownload).toBe(true)
    expect(view.isTerminal).toBe(true)
  })

  test('Should warn when a succeeded run discovered nothing', () => {
    const view = buildImportView({ status: 'Succeeded', datasets: [] })

    expect(view.noSourceFilesWarning).toBe(true)
    expect(view.canDownload).toBe(false)
  })

  test('Should not warn about a run that has not finished yet', () => {
    const view = buildImportView({ status: 'Running', datasets: [] })

    expect(view.noSourceFilesWarning).toBe(false)
    expect(view.isTerminal).toBe(false)
  })

  test('Should tolerate a document with no stages or datasets', () => {
    const view = buildImportView({ status: 'Queued' })

    expect(view.stages).toEqual([])
    expect(view.datasets).toEqual([])
    expect(view.sourceFileCount).toBe(0)
  })

  test('Should pass through a missing import as null', () => {
    expect(buildImportView(null)).toBeNull()
  })
})

describe('#buildImportSummaryView', () => {
  test('Should warn when a succeeded summary reports no files', () => {
    expect(
      buildImportSummaryView({ status: 'Succeeded', sourceFileCount: 0 })
        .noSourceFilesWarning
    ).toBe(true)

    expect(
      buildImportSummaryView({ status: 'Succeeded', sourceFileCount: 2 })
        .noSourceFilesWarning
    ).toBe(false)
  })
})

describe('#validateSourceFilename', () => {
  test('Should accept a source filename', () => {
    expect(
      validateSourceFilename('LITP_SAMCPHHOLDING_20251113121333.csv')
    ).toBeNull()
  })

  test('Should reject a missing file', () => {
    expect(validateSourceFilename(undefined)).toBe('Select a file to upload')
    expect(validateSourceFilename('  ')).toBe('Select a file to upload')
  })

  test('Should reject a path, which the backend will not accept as an object key', () => {
    expect(validateSourceFilename('litprd/LITP_SAMCPHHOLDING_1.csv')).toBe(
      'The filename must not contain a path'
    )
  })

  test('Should reject a file that is not a csv', () => {
    expect(validateSourceFilename('holdings.parquet')).toBe(
      'The file must be a .csv source file'
    )
  })
})

// ── Controllers ──────────────────────────────────────────

describe('#etlDashboardController', () => {
  test('Should render the imports and datasets the backend reports', async () => {
    apiRequest.mockImplementation((path) =>
      path === '/api/etl/datasets'
        ? {
            ok: true,
            status: 200,
            data: { datasets: [{ name: 'cts_keepers' }] }
          }
        : {
            ok: true,
            status: 200,
            data: {
              totalCount: 3,
              imports: [
                { importId: 'a', status: 'Succeeded', sourceFileCount: 1 }
              ]
            }
          }
    )

    const h = mockResponseToolkit()
    await etlDashboardController.handler(mockRequest(), h)

    const [template, context] = h.view.mock.calls[0]

    expect(template).toBe('etl/index')
    expect(context.imports[0].tagClass).toBe('govuk-tag--green')
    expect(context.datasets).toEqual([{ name: 'cts_keepers' }])
    expect(context.pagination.totalCount).toBe(3)
    expect(context.apiError).toBeNull()
  })

  test('Should page through the history', async () => {
    apiRequest.mockResolvedValue({ ok: true, status: 200, data: {} })

    await etlDashboardController.handler(
      mockRequest({ query: { page: 3 } }),
      mockResponseToolkit()
    )

    expect(apiRequest).toHaveBeenCalledWith('/api/etl/imports', {
      searchParams: { skip: 20, top: 10 }
    })
  })

  test('Should surface a failure to list imports without failing the page', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 500,
      data: { message: 'Mongo is down' }
    })

    const h = mockResponseToolkit()
    await etlDashboardController.handler(mockRequest(), h)

    const [, context] = h.view.mock.calls[0]

    expect(context.apiError).toBe('Mongo is down')
    expect(context.imports).toEqual([])
  })
})

describe('#etlStartImportController', () => {
  test('Should trigger against the internal source folder and follow the new import', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 202,
      data: { importId: 'abc', status: 'Queued' }
    })

    const h = mockResponseToolkit()
    await etlStartImportController.handler(
      mockRequest({ payload: { dataset: 'sam_cph_holdings' } }),
      h
    )

    expect(apiRequest).toHaveBeenCalledWith('/api/etl/imports', {
      method: 'POST',
      searchParams: { sourceType: 'internal', dataset: 'sam_cph_holdings' }
    })
    expect(h.redirect).toHaveBeenCalledWith('/etl/imports/abc')
  })

  test('Should send a rejected trigger to the run already in flight', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 409,
      data: { message: 'Already running', inFlightImportId: 'in-flight' }
    })

    const h = mockResponseToolkit()
    await etlStartImportController.handler(mockRequest(), h)

    expect(h.redirect).toHaveBeenCalledWith('/etl/imports/in-flight')
  })

  test('Should return to the page when the trigger is rejected outright', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 400,
      data: { message: "Unknown dataset 'nope'." }
    })

    const h = mockResponseToolkit()
    await etlStartImportController.handler(
      mockRequest({ payload: { dataset: 'nope' } }),
      h
    )

    expect(h.redirect).toHaveBeenCalledWith('/etl')
  })
})

describe('#etlUploadController', () => {
  test('Should upload under the original filename and start an import', async () => {
    apiUploadRequest.mockResolvedValue({ ok: true, status: 201, data: {} })
    apiRequest.mockResolvedValue({
      ok: true,
      status: 202,
      data: { importId: 'abc' }
    })

    const h = mockResponseToolkit()

    await etlUploadController.handler(
      mockRequest({
        payload: {
          file: fileStream('LITP_SAMCPHHOLDING_20251113121333.csv'),
          dataset: 'sam_cph_holdings',
          startAfterUpload: 'true'
        }
      }),
      h
    )

    expect(apiUploadRequest).toHaveBeenCalledWith(
      '/api/externalcatalogue/upload',
      expect.anything(),
      'LITP_SAMCPHHOLDING_20251113121333.csv'
    )
    expect(h.redirect).toHaveBeenCalledWith('/etl/imports/abc')
  })

  test('Should not start an import when it was not asked to', async () => {
    apiUploadRequest.mockResolvedValue({ ok: true, status: 201, data: {} })

    const h = mockResponseToolkit()

    await etlUploadController.handler(
      mockRequest({ payload: { file: fileStream('LITP_A_1.csv') } }),
      h
    )

    expect(apiRequest).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith('/etl')
  })

  test('Should reject an invalid filename before uploading anything', async () => {
    const h = mockResponseToolkit()

    await etlUploadController.handler(
      mockRequest({ payload: { file: fileStream('holdings.txt') } }),
      h
    )

    expect(apiUploadRequest).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith('/etl')
  })

  test('Should not start an import when the upload failed', async () => {
    apiUploadRequest.mockResolvedValue({
      ok: false,
      status: 400,
      data: { message: 'Filename does not match a dataset' }
    })

    const h = mockResponseToolkit()

    await etlUploadController.handler(
      mockRequest({
        payload: { file: fileStream('LITP_A_1.csv'), startAfterUpload: 'true' }
      }),
      h
    )

    expect(apiRequest).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith('/etl')
  })
})

describe('#etlDuckDbDownloadController', () => {
  test('Should redirect to the presigned URL', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { downloadUrl: 'https://s3.example/keeper.duckdb?signature' }
    })

    const h = mockResponseToolkit()
    await etlDuckDbDownloadController.handler(mockRequest(), h)

    expect(h.redirect).toHaveBeenCalledWith(
      'https://s3.example/keeper.duckdb?signature'
    )
  })

  test('Should return to the page when no database exists yet', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: 'No DuckDB staging databases found.' }
    })

    const h = mockResponseToolkit()
    await etlDuckDbDownloadController.handler(mockRequest(), h)

    expect(h.redirect).toHaveBeenCalledWith('/etl')
  })
})

describe('#etlSqliteDownloadController', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('Should stream the fetched file on success', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        downloadUrl: 'https://s3.example/cphs.sqlite?sig',
        objectKey: 'views/cphs_123.sqlite'
      }
    })

    const mockBody = new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.from([83, 81, 76, 105, 116, 101]))
        controller.close()
      }
    })

    global.fetch.mockResolvedValue({
      ok: true,
      body: mockBody
    })

    const h = mockResponseToolkit()
    await etlSqliteDownloadController.handler(mockRequest(), h)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://s3.example/cphs.sqlite?sig'
    )
    expect(h.response).toHaveBeenCalled()
    const responseStream = h.response.mock.calls[0][0]
    const chunks = []
    for await (const chunk of responseStream) {
      chunks.push(chunk)
    }
    expect(Buffer.concat(chunks).toString()).toBe('SQLite')

    const responseObj = h.response.mock.results[0].value
    expect(responseObj.type).toHaveBeenCalledWith('application/vnd.sqlite3')
    expect(responseObj.header).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="cphs_123.sqlite"'
    )
    expect(responseObj.header).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
  })

  test('Should show a safe message when no SQLite database exists', async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 404,
      data: {
        message:
          'No CPH SQLite export files found. Trigger one via POST /api/etl/exports/cphs.'
      }
    })

    const request = mockRequest()
    const h = mockResponseToolkit()
    await etlSqliteDownloadController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/etl')
    expect(request.yar.flash).toHaveBeenCalledWith('_flash', {
      message: 'No SQLite database is available to download',
      type: 'error',
      title: 'Error'
    })
    expect(request.yar.flash.mock.calls[0][1].message).not.toContain('/api/')
  })

  test('Should return to the page when the fetch fails', async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { downloadUrl: 'https://s3.example/cphs.sqlite?sig' }
    })

    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    })

    const request = mockRequest()
    const h = mockResponseToolkit()
    await etlSqliteDownloadController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/etl')
    expect(request.yar.flash).toHaveBeenCalledWith('_flash', {
      message: 'The SQLite database could not be downloaded. Try again later.',
      type: 'error',
      title: 'Error'
    })
  })
})
