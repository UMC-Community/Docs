import { access, copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const candidates = [process.env.UMC_SOURCE_DIR, resolve(root, '../UMC')].filter(Boolean)
let sourceRoot

for (const candidate of candidates) {
  try {
    await access(resolve(candidate, 'protocols/rpc-v1.md'))
    sourceRoot = candidate
    break
  } catch {}
}

if (!sourceRoot) {
  console.log('UMC source checkout not found; using the tracked protocol reference pages.')
} else {
  for (const name of ['rpc-v1.md', 'auth-v1.md']) {
    const source = resolve(sourceRoot, 'protocols', name)
    const destination = resolve(root, 'en/reference', name)
    await access(source)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(source, destination)
    console.log(`Synced UMC protocols/${name} -> en/reference/${name}`)
  }
}
