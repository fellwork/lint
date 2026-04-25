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

// bumpp v11 uses --release <type> instead of positional arg
// --commit, --tag, --push are all booleans (push defaults true)
if (isCanary) {
  run('bunx', ['bumpp', '--preid', 'canary', '--release', 'prerelease', '--commit', '--tag', '--push'])
  run('bun', ['publish', '--tag', 'canary'])
} else {
  run('bunx', ['bumpp', '--release', bumpLevel, '--commit', '--tag', '--push'])
  run('bun', ['publish'])
}
