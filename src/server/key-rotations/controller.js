import { apiRequest } from '../common/helpers/api-client.js'
import { buildPagination, pageToSkip } from '../common/helpers/pagination.js'

const PAGE_SIZE = 20

const breadcrumbs = [{ text: 'Home', href: '/' }, { text: 'Key Rotations' }]

export const keyRotationsController = {
  async handler(request, h) {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)

    const result = await apiRequest('/api/key-rotations', {
      searchParams: { page, pageSize: PAGE_SIZE }
    })

    const rotations = result.ok ? (result.data?.items ?? []) : []
    const totalCount = result.ok
      ? (result.data?.totalCount ?? rotations.length)
      : 0

    return h.view('key-rotations/index', {
      pageTitle: 'Key Rotations',
      heading: 'External storage key rotations',
      breadcrumbs,
      rotations,
      pagination: buildPagination(
        pageToSkip(page, PAGE_SIZE),
        PAGE_SIZE,
        totalCount,
        '/key-rotations'
      ),
      apiError: result.ok
        ? null
        : (result.data?.message ?? 'Failed to load key rotations')
    })
  }
}
