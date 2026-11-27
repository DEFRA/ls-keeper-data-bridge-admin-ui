export function buildNavigation(request) {
  return [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'ETL',
      href: '/etl',
      current: request?.path?.startsWith('/etl')
    },
    {
      text: 'Issues',
      href: '/issues',
      current: request?.path?.startsWith('/issues')
    },
    {
      text: 'External Catalogue',
      href: '/external-catalogue',
      current: request?.path?.startsWith('/external-catalogue')
    },
    {
      text: 'Key Rotations',
      href: '/key-rotations',
      current: request?.path?.startsWith('/key-rotations')
    },
    {
      text: 'Backend Health',
      href: '/backend-health',
      current: request?.path?.startsWith('/backend-health')
    }
  ]
}
