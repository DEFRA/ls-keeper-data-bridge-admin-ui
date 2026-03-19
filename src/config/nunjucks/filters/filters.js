import assign from 'lodash/assign.js'

import { formatDate } from './format-date.js'
import { formatCurrency } from './format-currency.js'
import { formatDuration } from './format-duration.js'
import { formatFileSize } from './format-file-size.js'

function keys(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj) : []
}

export {
  assign,
  formatDate,
  formatCurrency,
  formatDuration,
  formatFileSize,
  keys
}
