import {
  listPoliciesController,
  activatePolicyController,
  deactivateAllController,
  createPolicyGetController,
  createPolicyPostController,
  editPolicyGetController,
  editPolicyPostController,
  deletePolicyGetController,
  deletePolicyPostController
} from './controller.js'

export const throttlePolicies = {
  plugin: {
    name: 'throttle-policies',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/throttle-policies',
          ...listPoliciesController
        },
        {
          method: 'GET',
          path: '/throttle-policies/create',
          ...createPolicyGetController
        },
        {
          method: 'POST',
          path: '/throttle-policies/create',
          ...createPolicyPostController
        },
        {
          method: 'POST',
          path: '/throttle-policies/deactivate',
          ...deactivateAllController
        },
        {
          method: 'GET',
          path: '/throttle-policies/{slug}/edit',
          ...editPolicyGetController
        },
        {
          method: 'POST',
          path: '/throttle-policies/{slug}/edit',
          ...editPolicyPostController
        },
        {
          method: 'GET',
          path: '/throttle-policies/{slug}/delete',
          ...deletePolicyGetController
        },
        {
          method: 'POST',
          path: '/throttle-policies/{slug}/delete',
          ...deletePolicyPostController
        },
        {
          method: 'POST',
          path: '/throttle-policies/{slug}/activate',
          ...activatePolicyController
        }
      ])
    }
  }
}
