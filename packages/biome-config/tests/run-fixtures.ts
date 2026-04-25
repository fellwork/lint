import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')

interface FixtureFailure {
  preset: string
  file: string
  reason: string
}

const failures: FixtureFailure[] = []

function listPresets(): string[] {
  return readdirSync(FIXTURES_DIR).filter(name => {
    if (name.startsWith('.')) return false
    if (name.startsWith('_')) return false
    return statSync(join(FIXTURES_DIR, name)).isDirectory()
  })
}

/**
 * Run biome with the fixture directory as cwd so that biome discovers
 * the fixture's own biome.json (Biome 1.9.x resolves config by walking up
 * from the working directory, not the file path).
 */
function runBiome(
  args: string[],
  fixtureCwd: string,
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('bunx', ['biome', ...args], {
    encoding: 'utf8',
    cwd: fixtureCwd,
  })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/**
 * Extract lint rule IDs from Biome's --reporter=json stdout.
 *
 * Biome 1.9.4 uses `category` as the field name on each diagnostic object,
 * e.g. "lint/suspicious/noDebugger". We collect only lint/ categories to
 * avoid format/other categories polluting the rule-ID set.
 */
function extractRuleIds(jsonReporterStdout: string): Set<string> {
  const ids = new Set<string>()
  try {
    const parsed = JSON.parse(jsonReporterStdout)
    const diagnostics: Array<Record<string, unknown>> =
      parsed.diagnostics ?? parsed.summary?.diagnostics ?? []
    for (const diag of diagnostics) {
      const id = (diag.category ?? diag.rule ?? diag.code) as string | undefined
      if (id && id.startsWith('lint/')) ids.add(id)
    }
  } catch {
    // empty set; caller treats as failure
  }
  return ids
}

function assertGood(preset: string, dir: string, file: string) {
  const result = runBiome(['check', file], dir)
  if (result.status !== 0) {
    failures.push({
      preset,
      file,
      reason: `expected clean lint, got exit ${result.status}:\n${result.stdout}\n${result.stderr}`,
    })
  }
}

function assertBad(preset: string, dir: string, file: string) {
  const expectedPath = join(dir, file.replace(/\.[^.]+$/, '.expected.txt'))
  if (!existsSync(expectedPath)) {
    failures.push({ preset, file, reason: `missing ${file.replace(/\.[^.]+$/, '.expected.txt')}` })
    return
  }
  const expected = new Set(
    readFileSync(expectedPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
  )
  const result = runBiome(['check', '--reporter=json', file], dir)
  if (result.status === 0) {
    failures.push({ preset, file, reason: 'expected violations, got clean lint' })
    return
  }
  const reported = extractRuleIds(result.stdout)
  const missing = [...expected].filter(id => !reported.has(id))
  const unexpected = [...reported].filter(id => !expected.has(id))
  if (missing.length || unexpected.length) {
    const parts: string[] = []
    if (missing.length) parts.push(`missing: ${missing.join(', ')}`)
    if (unexpected.length) parts.push(`unexpected: ${unexpected.join(', ')}`)
    failures.push({ preset, file, reason: parts.join('; ') })
  }
}

function runPreset(preset: string) {
  const dir = join(FIXTURES_DIR, preset)
  const entries = readdirSync(dir)
  for (const entry of entries) {
    if (entry === 'biome.json') continue
    if (entry.endsWith('.expected.txt')) continue
    if (entry.startsWith('good.')) {
      assertGood(preset, dir, entry)
    } else if (entry.startsWith('bad.')) {
      assertBad(preset, dir, entry)
    }
  }
}

const presets = listPresets()
if (presets.length === 0) {
  console.error('no fixtures found under tests/fixtures/')
  process.exit(1)
}

for (const preset of presets) {
  runPreset(preset)
}

if (failures.length > 0) {
  console.error(`\n${failures.length} fixture failure(s):`)
  for (const f of failures) {
    console.error(`  [${f.preset}/${f.file}] ${f.reason}`)
  }
  process.exit(1)
}

console.log(`✓ all fixtures pass (${presets.length} preset${presets.length === 1 ? '' : 's'})`)
