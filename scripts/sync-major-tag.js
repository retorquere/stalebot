#!/usr/bin/env node

const { execSync } = require('node:child_process')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

function run(command) {
  execSync(command, { stdio: 'inherit' })
}

function main() {
  const packagePath = join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const version = String(packageJson.version || '')
  const [major] = version.split('.')

  if (!/^\d+$/.test(major)) {
    throw new Error(`Could not parse major version from package.json version: ${version}`)
  }

  const majorTag = `v${major}`

  console.log(`Syncing moving major tag ${majorTag} -> HEAD`)
  run(`git tag -f ${majorTag}`)

  console.log('Pushing release tags to origin')
  run('git push origin --follow-tags')
  run(`git push origin --force ${majorTag}`)

  console.log('Release tags pushed successfully.')
}

main()