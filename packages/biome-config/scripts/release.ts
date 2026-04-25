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
if (isCanary) {
  run('bunx', ['bumpp', '-y', '--preid', 'canary', '--release', 'prerelease'])
  run('bun', ['publish', '--tag', 'canary'])
} else {
  run('bunx', ['bumpp', '-y', '--release', bumpLevel])
  run('bun', ['publish'])
}
