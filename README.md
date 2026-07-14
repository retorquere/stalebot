# Stalebot

GitHub Action that labels open issues as stale when:

- the most recent non-maintainer activity is older than a configurable number of days
- there is at least one maintainer comment on the issue
- the last comment was from a maintainer (`OWNER`, `COLLABORATOR`, or `MEMBER`)

It also removes the stale label when an issue no longer qualifies (for example, after new activity or when the latest comment is not from a maintainer).
It also removes the stale label when an issue is closed.

Stale marking and regular stale cleanup are done by scanning open issues (up to 100 recently updated issues). Event-driven stale cleanup is done on issue close and on new non-maintainer comments in open issues.

Issues are skipped when:

- they are pull requests
- they already have the stale label
- they contain any label listed in `ignore`

## Inputs

| Name            | Required | Default | Description                                                                                                |
|-----------------|----------|---------|------------------------------------------------------------------------------------------------------------|
| `github-token`  | Yes      | -       | GitHub token used to read and label issues.                                                                |
| `days-inactive` | No       | `14`    | Number of inactive days before an issue is considered stale.                                               |
| `ignore`        | No       | ``      | Comma-separated labels that exempt an issue from stale labeling (for example: `wip,blocked,needs-design`). |
| `stale`         | No       | `stale` | Label to apply to qualifying issues.                                                                       |

## Example workflow

```yaml
name: Label Unanswered Maintainer Issues

on:
  issues:
    types: [closed]
  issue_comment:
    types: [created]
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  stale:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Run stalebot
        uses: retorquere/stalebot@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          days-inactive: '14'
          stale: 'stale'
          ignore: 'wip,blocked,in-progress'
```

## Notes

- This action currently inspects up to 100 most recently updated open issues per run.
- Make sure the token has permission to read and write issues.
- The test pipeline now fails if `dist/index.js` contains unresolved module markers (for example `webpackMissingModule`).

## Releasing

This repository has a `postversion` hook. Running `npm version <type>` will:

- typecheck TypeScript source and bundle `src/index.ts` with ncc into `dist/index.js`, then stage `dist`
- bump `package.json` version and create the version tag (for example `v1.5.0`)
- move the major action tag (for example `v1`) to the same commit
- push release tags (`git push origin --follow-tags`)
- force-update and push the moving major tag (for example `git push origin --force v1`)

This keeps `retorquere/stalebot@v1` pointing at the latest `1.x` release.
