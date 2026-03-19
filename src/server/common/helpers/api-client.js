import { config } from '../../../config/config.js'
import { createLogger } from './logging/logger.js'

const logger = createLogger()

/**
 * Makes a request to the backend Keeper Data Bridge API.
 *
 * @param {string} path - API path (e.g. '/api/Import')
 * @param {object} [options] - Fetch options
 * @param {string} [options.method] - HTTP method (default: GET)
 * @param {object} [options.body] - Request body (will be JSON-serialised)
 * @param {object} [options.searchParams] - URL query parameters
 * @param {object} [options.headers] - Additional headers
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiRequest(path, options = {}) {
  const baseUrl = config.get('backendApi.baseUrl')
  const authorizationApiKey = config.get('backendApi.authorizationApiKey')
  const xApiKey = config.get('backendApi.xApiKey')
  const { method = 'GET', body, searchParams, headers = {} } = options

  // Ensure baseUrl trailing slash is normalised and path is appended correctly
  const normalisedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalisedPath = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(normalisedPath, normalisedBase)

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const fetchOptions = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers
    }
  }

  if (authorizationApiKey) {
    fetchOptions.headers.Authorization = `ApiKey ${authorizationApiKey}`
  }

  if (xApiKey) {
    fetchOptions.headers['x-api-key'] = xApiKey
  }

  if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  logger.debug({ method, url: url.toString() }, 'API request')

  let response
  try {
    response = await fetch(url.toString(), fetchOptions)
  } catch (error) {
    logger.error(
      { method, path, error: error.message },
      'API request network error'
    )
    return {
      ok: false,
      status: 0,
      data: { message: `Network error: ${error.message}` }
    }
  }

  let data = null

  const contentType = response.headers.get('content-type') ?? ''
  if (
    contentType.includes('application/json') ||
    contentType.includes('text/json')
  ) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else if (contentType.includes('text/')) {
    data = await response.text()
  }

  if (!response.ok) {
    logger.warn({ status: response.status, path, data }, 'API request failed')
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}

/**
 * Uploads a file to the backend API as multipart/form-data.
 *
 * @param {string} path - API path
 * @param {object} fileStream - Readable stream (from Hapi multipart payload)
 * @param {string} objectKey - Filename / object key query parameter
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiUploadRequest(path, fileStream, objectKey) {
  const baseUrl = config.get('backendApi.baseUrl')
  const authorizationApiKey = config.get('backendApi.authorizationApiKey')
  const xApiKey = config.get('backendApi.xApiKey')

  const normalisedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalisedPath = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(normalisedPath, normalisedBase)
  url.searchParams.set('objectKey', objectKey)

  const formData = new FormData()

  // Read the stream into a buffer
  const chunks = []
  for await (const chunk of fileStream) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  const filename = fileStream.hapi?.filename ?? objectKey

  formData.append('file', new Blob([buffer]), filename)

  const headers = {
    Accept: 'application/json'
  }

  if (authorizationApiKey) {
    headers.Authorization = `ApiKey ${authorizationApiKey}`
  }

  if (xApiKey) {
    headers['x-api-key'] = xApiKey
  }

  logger.debug({ method: 'POST', url: url.toString() }, 'API upload request')

  let response
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: formData
    })
  } catch (error) {
    logger.error(
      { method: 'POST', path, error: error.message },
      'API upload request network error'
    )
    return {
      ok: false,
      status: 0,
      data: { message: `Network error: ${error.message}` }
    }
  }

  let data = null
  const contentType = response.headers.get('content-type') ?? ''
  if (
    contentType.includes('application/json') ||
    contentType.includes('text/json')
  ) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else if (contentType.includes('text/')) {
    data = await response.text()
  }

  if (!response.ok) {
    logger.warn(
      { status: response.status, path, data },
      'API upload request failed'
    )
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}
