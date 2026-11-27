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
        text: 'ETL',
        href: '/etl'
      },
      {
        current: false,
        text: 'Issues',
        href: '/issues'
      },
      {
        current: false,
        text: 'External Catalogue',
        href: '/external-catalogue'
      },
      {
        current: false,
        text: 'Key Rotations',
        href: '/key-rotations'
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
        text: 'ETL',
        href: '/etl'
      },
      {
        current: false,
        text: 'Issues',
        href: '/issues'
      },
      {
        current: false,
        text: 'External Catalogue',
        href: '/external-catalogue'
      },
      {
        current: false,
        text: 'Key Rotations',
        href: '/key-rotations'
      },
      {
        current: false,
        text: 'Backend Health',
        href: '/backend-health'
      }
    ])
  })

  test('Should highlight Key Rotations on its pages', () => {
    const keyRotations = buildNavigation(
      mockRequest({ path: '/key-rotations' })
    ).find((item) => item.href === '/key-rotations')

    expect(keyRotations.current).toBe(true)
  })
})
