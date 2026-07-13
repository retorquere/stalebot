import * as core from '@actions/core'
import * as github from '@actions/github'

async function run() {
  try {
    const token = core.getInput('github-token', { required: true })
    const daysInactive = parseInt(core.getInput('days-inactive'), 10)
    const labels = {
      stale: core.getInput('stale'),
      ignore: core.getInput('ignore')
        .split(',')
        .map(label => label.trim().toLowerCase())
        .filter(Boolean),
    }

    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo
    const maintainers = ['OWNER', 'COLLABORATOR', 'MEMBER']

    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysInactive)

    async function fresh(issueNumber) {
      try {
        await octokit.rest.issues.removeLabel({
          owner,
          repo,
          issue_number: issueNumber,
          name: labels.stale,
        })
      }
      catch (error) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          return
        }
        throw error
      }
    }

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
      const issueLabels = issue.labels
        .flatMap(l => typeof l.name === 'string' ? [l.name.toLowerCase()] : [])
      const labeled = {
        stale: issueLabels.includes(labels.stale.toLowerCase()),
        ignore: issueLabels.some(l => labels.wip.includes(l)),
      }

      if (labeled.ignore) {
        if (labeled.stale) {
          core.info(`Issue #${issue.number}: Removing stale label because it has a wip label`)
          await fresh(issue.number)
        }
        continue
      }

      const updated = new Date(issue.updated_at)
      if (updated > threshold) {
        if (labeled.stale) {
          core.info(`Issue #${issue.number}: Removing stale label because issue is active`)
          await fresh(issue.number)
        }
        continue
      }

      if (issue.comments === 0) {
        if (labeled.stale) {
          core.info(`Issue #${issue.number}: Removing stale label because issue has no comments`)
          await fresh(issue.number)
        }
        continue
      }

      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 1,
        sort: 'created',
        direction: 'desc',
      })

      const lastComment = comments[0]
      const role = lastComment?.author_association
      const shouldBeStale = role ? maintainers.includes(role) : false

      if (shouldBeStale && !labeled.stale) {
        core.info(`Issue #${issue.number}: Last active user role was ${role}`)

        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: issue.number,
          labels: [labels.stale],
        })
      }
      else if (!shouldBeStale && labeled.stale) {
        core.info(`Issue #${issue.number}: Removing stale label because last comment was not from a maintainer`)
        await fresh(issue.number)
      }
    }
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
