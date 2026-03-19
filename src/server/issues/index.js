import {
  issuesListController,
  issueDetailController,
  assignIssueController,
  unassignIssueController,
  ignoreIssueController,
  unignoreIssueController,
  updateResolutionStatusController
} from './controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const issues = {
  plugin: {
    name: 'issues',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/issues',
          ...issuesListController
        },
        {
          method: 'GET',
          path: '/issues/{issueId}',
          ...issueDetailController
        },
        {
          method: 'POST',
          path: '/issues/{issueId}/assign',
          ...assignIssueController
        },
        {
          method: 'POST',
          path: '/issues/{issueId}/unassign',
          ...unassignIssueController
        },
        {
          method: 'POST',
          path: '/issues/{issueId}/ignore',
          ...ignoreIssueController
        },
        {
          method: 'POST',
          path: '/issues/{issueId}/unignore',
          ...unignoreIssueController
        },
        {
          method: 'POST',
          path: '/issues/{issueId}/resolution-status',
          ...updateResolutionStatusController
        }
      ])
    }
  }
}

export { issues }
