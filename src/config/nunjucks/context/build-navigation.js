export function buildNavigation(request) {
  return [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'Imports',
      href: '/import',
      current: request?.path?.startsWith('/import')
    },
    {
      text: 'Cleanse',
      href: '/cleanse',
      current:
        request?.path?.startsWith('/cleanse') &&
        !request?.path?.startsWith('/cleanse-export')
    },
    {
      text: 'Cleanse Export',
      href: '/cleanse-export',
      current: request?.path?.startsWith('/cleanse-export')
    },
    {
      text: 'Issues',
      href: '/issues',
      current: request?.path?.startsWith('/issues')
    },
    {
      text: 'Query Data',
      href: '/query',
      current: request?.path?.startsWith('/query')
    },
    {
      text: 'Holdings',
      href: '/holdings',
      current: request?.path?.startsWith('/holdings')
    },
    {
      text: 'Throttle Policies',
      href: '/throttle-policies',
      current: request?.path?.startsWith('/throttle-policies')
    },
    {
      text: 'External Catalogue',
      href: '/external-catalogue',
      current: request?.path?.startsWith('/external-catalogue')
    }
  ]
}
