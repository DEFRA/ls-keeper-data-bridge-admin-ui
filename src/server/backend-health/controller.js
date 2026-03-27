import { apiRequest } from '../common/helpers/api-client.js'

const breadcrumbs = [{ text: 'Home', href: '/' }, { text: 'Backend Health' }]

/**
 * Transform the raw health-check response into a template-friendly array.
 * Each entry: { key, name, status, description, data }
 * where data is an array of { key, value } pairs (flattened one level).
 */
export function transformHealthResults(results) {
  if (!results || typeof results !== 'object') return []

  return Object.entries(results).map(([key, entry]) => {
    const dataItems = []

    if (entry.data && typeof entry.data === 'object') {
      for (const [dk, dv] of Object.entries(entry.data)) {
        if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
          // Nested object — flatten its properties prefixed with parent key
          for (const [nk, nv] of Object.entries(dv)) {
            dataItems.push({ key: `${dk}.${nk}`, value: String(nv) })
          }
        } else if (Array.isArray(dv)) {
          dataItems.push({ key: dk, value: dv.join(', ') })
        } else {
          dataItems.push({ key: dk, value: String(dv) })
        }
      }
    }

    return {
      key,
      name: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      status: entry.status ?? 'Unknown',
      description: entry.description ?? null,
      data: dataItems
    }
  })
}

export const backendHealthController = {
  async handler(request, h) {
    const result = await apiRequest('/health')

    const overallStatus = result.data?.status ?? (result.ok ? 'Unknown' : null)
    const checks = transformHealthResults(result.data?.results)

    return h.view('backend-health/index', {
      pageTitle: 'Backend Health',
      heading: 'Backend Health',
      breadcrumbs,
      overallStatus,
      checks,
      apiError: !result.ok
        ? (result.data?.message ?? 'Failed to reach backend health endpoint')
        : null
    })
  }
}
