import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'Imports',
        href: '/import'
      },
      {
        current: false,
        text: 'Cleanse',
        href: '/cleanse'
      },
      {
        current: false,
        text: 'Cleanse Export',
        href: '/cleanse-export'
      },
      {
        current: false,
        text: 'Issues',
        href: '/issues'
      },
      {
        current: false,
        text: 'Query Data',
        href: '/query'
      },
      {
        current: false,
        text: 'Holdings',
        href: '/holdings'
      },
      {
        current: false,
        text: 'Throttle Policies',
        href: '/throttle-policies'
      },
      {
        current: false,
        text: 'External Catalogue',
        href: '/external-catalogue'
      },
      {
        current: false,
        text: 'Backend Health',
        href: '/backend-health'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'Imports',
        href: '/import'
      },
      {
        current: false,
        text: 'Cleanse',
        href: '/cleanse'
      },
      {
        current: false,
        text: 'Cleanse Export',
        href: '/cleanse-export'
      },
      {
        current: false,
        text: 'Issues',
        href: '/issues'
      },
      {
        current: false,
        text: 'Query Data',
        href: '/query'
      },
      {
        current: false,
        text: 'Holdings',
        href: '/holdings'
      },
      {
        current: false,
        text: 'Throttle Policies',
        href: '/throttle-policies'
      },
      {
        current: false,
        text: 'External Catalogue',
        href: '/external-catalogue'
      },
      {
        current: false,
        text: 'Backend Health',
        href: '/backend-health'
      }
    ])
  })
})
