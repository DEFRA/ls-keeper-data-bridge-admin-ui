/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param {number|null} ms - Duration in milliseconds
 * @returns {string} e.g. "45s", "12m 34s", "1h 5m", or "—"
 */
export function formatDuration(ms) {
  if (ms == null) return '—'

  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`

  if (totalSec < 3600) {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}m ${s}s`
  }

  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return `${h}h ${m}m`
}
