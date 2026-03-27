/**
 * Format a number with locale-appropriate thousands separators.
 * @param {number|string} value
 * @returns {string}
 */
export function formatNumber(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return String(value ?? '')
  return n.toLocaleString('en-GB')
}
