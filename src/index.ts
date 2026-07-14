import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true })
    const daysInactive = Number.parseInt(core.getInput('days-inactive'), 10)
    const labels = {
      stale: core.getInput('stale'),
      ignore: core.getInput('ignore')
        .split(',')
        .map(label => label.trim().toLowerCase())
        .filter(Boolean),
    }

    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo
    const maintainers = new Set(['OWNER', 'COLLABORATOR', 'MEMBER'])

    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysInactive)

    async function getIssueCommentContext(issueNumber: number): Promise<{
      lastCommentRole?: string
      lastNonMaintainerCommentAt?: Date
      hasMaintainerComment: boolean
    }> {
      let page = 1
      let lastCommentRole: string | undefined
      let hasMaintainerComment = false

      while (true) {
        const { data: comments } = await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number: issueNumber,
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc',
        })

        if (comments.length === 0) break

        if (!lastCommentRole) {
          const role = comments[0]?.author_association
          if (typeof role === 'string') {
            lastCommentRole = role
          }
        }

        if (!hasMaintainerComment) {
          hasMaintainerComment = comments.some((comment) => {
            const role = comment.author_association
            return typeof role === 'string' && maintainers.has(role)
          })
        }

        const lastNonMaintainerComment = comments.find((comment) => {
          const role = comment.author_association
          return typeof role === 'string' && !maintainers.has(role)
        })

        if (lastNonMaintainerComment) {
          return {
            lastCommentRole,
            lastNonMaintainerCommentAt: new Date(lastNonMaintainerComment.created_at),
            hasMaintainerComment,
          }
        }

        if (comments.length < 100) break
        page += 1
      }

      return {
        lastCommentRole,
        hasMaintainerComment,
      }
    }

    async function fresh(issueNumber: number): Promise<void> {
      try {
        await octokit.rest.issues.removeLabel({
          owner,
          repo,
          issue_number: issueNumber,
          name: labels.stale,
        })
      }
      catch (error: unknown) {
        if (
          typeof error === 'object'
          && error !== null
          && 'status' in error
          && error.status === 404
        ) {
          return
        }
        throw error
      }
    }

    const payloadIssue = github.context.payload.issue
    if (payloadIssue) {
      if (payloadIssue.state === 'closed') {
        core.info(`Issue #${payloadIssue.number}: Closed event detected, removing stale label if present`)
        await fresh(payloadIssue.number)
      }
      else if (github.context.eventName === 'issue_comment' && payloadIssue.state === 'open') {
        const role = github.context.payload.comment?.author_association
        const isMaintainerComment = typeof role === 'string' && maintainers.has(role)
        if (!isMaintainerComment) {
          core.info(`Issue #${payloadIssue.number}: New non-maintainer comment, removing stale label if present`)
          await fresh(payloadIssue.number)
        }
        else {
          core.info(`Issue #${payloadIssue.number}: Maintainer comment, no event-driven unstale action`)
        }
      }
      else {
        core.info(`Issue #${payloadIssue.number}: No event-driven unstale action for this event`)
      }
      return
    }

    core.info('No issue in event payload; scanning open repository issues')
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    })

    for (const issue of issues) {
      if (issue.pull_request) continue

      const issueLabels = (issue.labels ?? []).flatMap((label): string[] => {
        if (typeof label === 'string') return [label.toLowerCase()]
        if (typeof label.name === 'string') return [label.name.toLowerCase()]
        return []
      })

      const labeled = {
        stale: issueLabels.includes(labels.stale.toLowerCase()),
        ignore: issueLabels.some(label => labels.ignore.includes(label)),
      }

      if (labeled.ignore) {
        if (labeled.stale) {
          core.info(`Issue #${issue.number}: Removing stale label because it has an ignored label`)
          await fresh(issue.number)
        }
        continue
      }

      let lastNonMaintainerActivityAt: Date | undefined
      const issueAuthorRole = issue.author_association
      if (typeof issueAuthorRole === 'string' && !maintainers.has(issueAuthorRole)) {
        lastNonMaintainerActivityAt = new Date(issue.created_at)
      }

      let lastCommentRole: string | undefined
      let hasMaintainerComment = false
      if (issue.comments > 0) {
        const commentContext = await getIssueCommentContext(issue.number)
        lastCommentRole = commentContext.lastCommentRole
        hasMaintainerComment = commentContext.hasMaintainerComment
        if (commentContext.lastNonMaintainerCommentAt) {
          lastNonMaintainerActivityAt = commentContext.lastNonMaintainerCommentAt
        }
      }

      const lastCommentIsMaintainer = typeof lastCommentRole === 'string' && maintainers.has(lastCommentRole)
      const nonMaintainerIsInactive = !!lastNonMaintainerActivityAt && lastNonMaintainerActivityAt <= threshold
      const shouldBeStale = hasMaintainerComment && lastCommentIsMaintainer && nonMaintainerIsInactive

      if (shouldBeStale && !labeled.stale) {
        core.info(`Issue #${issue.number}: Last comment was from maintainer and non-maintainer activity is older than ${daysInactive} days`)

        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: issue.number,
          labels: [labels.stale],
        })
      }
      else if (!shouldBeStale && labeled.stale) {
        core.info(`Issue #${issue.number}: Removing stale label because stale criteria are no longer met`)
        await fresh(issue.number)
      }
    }
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

void run()
