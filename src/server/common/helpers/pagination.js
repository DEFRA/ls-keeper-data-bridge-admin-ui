/**
 * Builds pagination view model from API response parameters.
 *
 * @param {number} skip - Number of records skipped
 * @param {number} top - Page size
 * @param {number} totalCount - Total number of records
 * @param {string} basePath - Base URL path for pagination links
 * @param {object} [queryParams] - Additional query parameters to preserve
 * @returns {{ currentPage: number, totalPages: number, basePath: string, queryParams: object, skip: number, top: number, totalCount: number }}
 */
export function buildPagination(
  skip,
  top,
  totalCount,
  basePath,
  queryParams = {}
) {
  const pageSize = top || 20
  const currentPage = Math.floor(skip / pageSize) + 1
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    currentPage,
    totalPages,
    basePath,
    queryParams,
    skip,
    top: pageSize,
    totalCount
  }
}

/**
 * Converts a page number to skip value.
 *
 * @param {number|string} page - Page number (1-based)
 * @param {number} [pageSize] - Items per page
 * @returns {number}
 */
export function pageToSkip(page, pageSize = 20) {
  const p = Math.max(1, parseInt(page, 10) || 1)
  return (p - 1) * pageSize
}
