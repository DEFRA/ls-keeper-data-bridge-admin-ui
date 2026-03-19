const FLASH_KEY = '_flash'

/**
 * Set a flash message in the session.
 *
 * @param {object} request - Hapi request
 * @param {string} message - Message text
 * @param {object} [options]
 * @param {string} [options.type] - 'success' (default) or other notification type
 * @param {string} [options.title] - Banner title
 */
export function setFlash(request, message, options = {}) {
  request.yar.flash(FLASH_KEY, {
    message,
    type: options.type ?? 'success',
    title: options.title ?? 'Success'
  })
}

/**
 * Get and clear flash messages from the session.
 *
 * @param {object} request - Hapi request
 * @returns {object|null} Flash message or null
 */
export function getFlash(request) {
  const messages = request.yar.flash(FLASH_KEY)
  return messages?.length ? messages[0] : null
}
