import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'en')
const targetRoot = join(root, 'zh')

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
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
    await stat(path)
    return true
  } catch {
    return false
  }
}

function splitFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) {
    return { frontmatter: '', body: text }
  }
  return { frontmatter: match[1], body: text.slice(match[0].length) }
}

function withTranslationMeta(frontmatter, relativePath) {
  const lines = frontmatter
    ? frontmatter
        .split(/\r?\n/)
        .filter((line) => !/^(translation|source)\s*:/.test(line.trim()))
    : []
  lines.push('translation: pending')
  lines.push(`source: en/${relativePath.replaceAll('\\', '/')}`)
  return lines.join('\n')
}

const files = await markdownFiles(sourceRoot)
let created = 0
let refreshed = 0
let unchanged = 0
let existing = 0

for (const file of files) {
  const relativePath = relative(sourceRoot, file)
  const target = join(targetRoot, relativePath)
  let targetExists = false
  let currentContent = null

  if (await exists(target)) {
    targetExists = true
    currentContent = await readFile(target, 'utf8')
    // Files without the pending marker are treated as edited translations and
    // are never overwritten. Pending files are managed English fallbacks.
    if (!/^translation\s*:\s*pending\s*$/m.test(currentContent)) {
      existing += 1
      continue
    }
  }

  let content = await readFile(file, 'utf8')
  content = content
    .replaceAll('](/en/', '](/zh/')
    .replaceAll('href="/en/', 'href="/zh/')
  const { frontmatter, body } = splitFrontmatter(content)
  const output = `---\n${withTranslationMeta(frontmatter, relativePath)}\n---\n\n${body.replace(/^\s+/, '')}`

  if (targetExists && currentContent === output) {
    unchanged += 1
    continue
  }

  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, output)
  if (targetExists) {
    refreshed += 1
    console.log(`refreshed zh/${relativePath}`)
  } else {
    created += 1
    console.log(`created zh/${relativePath}`)
  }
}

console.log(
  `i18n sync: ${created} created, ${refreshed} refreshed, ${unchanged} unchanged, ${existing} translated, ${files.length} English pages`,
)
