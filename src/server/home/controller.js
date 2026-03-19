/**
 * Dashboard home page controller.
 */
export const homeController = {
  handler(_request, h) {
    return h.view('home/index', {
      pageTitle: 'Dashboard',
      heading: 'Keeper Data Bridge Admin'
    })
  }
}
