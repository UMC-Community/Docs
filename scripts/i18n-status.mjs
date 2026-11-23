import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const englishRoot = join(root, 'en')
const chineseRoot = join(root, 'zh')

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(path)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path)
    }
  }
  return files
}

async function exists(path) {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

const pending = []
const orphans = []

for (const file of await markdownFiles(chineseRoot)) {
  const relativePath = relative(chineseRoot, file)
  const source = join(englishRoot, relativePath)
  const content = await readFile(file, 'utf8')

  if (!(await exists(source))) {
    orphans.push(relativePath)
  } else if (/^translation\s*:\s*pending\s*$/m.test(content)) {
    pending.push(relativePath)
  }
}

console.log(`Chinese pages needing translation: ${pending.length}`)
for (const file of pending) console.log(`  pending  ${file}`)

console.log(`Orphan Chinese pages: ${orphans.length}`)
for (const file of orphans) console.log(`  orphan   ${file}`)

if (orphans.length > 0) {
  process.exitCode = 1
}
