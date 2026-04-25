import { spawnSync } from 'node:child_process'

const bumpLevel = process.env.SEMVER_LEVEL
const isCanary = bumpLevel === 'canary'

if (!bumpLevel) {
  console.error('SEMVER_LEVEL env var is required (patch | minor | major | canary)')
  process.exit(1)
}

if (!['patch', 'minor', 'major', 'canary'].includes(bumpLevel)) {
  console.error(`unknown SEMVER_LEVEL: ${bumpLevel}`)
  process.exit(1)
}

function run(cmd: string, args: string[]) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`command failed: ${cmd} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

// bumpp v11: --release <type> (not positional). -y skips the confirmation prompt
// (required in CI; without it bumpp hangs on stdin). commit/tag/push default true.
//
// Use `npm publish` rather than `bun publish` — bun's publish auth is
// flaky (ignores NODE_AUTH_TOKEN, ignores NPM_CONFIG_TOKEN, ignores
// .npmrc files in CI for granular tokens, falls back to interactive
// browser auth that times out). npm publish reads the standard
// NODE_AUTH_TOKEN + .npmrc pattern and is battle-tested with all npm
// token types (Classic, Automation, Granular).
if (isCanary) {
  run('bunx', ['bumpp', '-y', '--preid', 'canary', '--release', 'prerelease'])
  run('npm', ['publish', '--tag', 'canary', '--access', 'public'])
} else {
  run('bunx', ['bumpp', '-y', '--release', bumpLevel])
  run('npm', ['publish', '--access', 'public'])
}
