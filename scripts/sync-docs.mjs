import { access, copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contracts = [
  {
    env: 'UMC_SOURCE_DIR',
    sibling: '../UMC',
    files: ['rpc-v1.md'],
  },
  {
    env: 'UMC_AUTH_SOURCE_DIR',
    sibling: '../UMC-Auth',
    files: ['auth-v1.md'],
  },
]

for (const contract of contracts) {
  const candidates = [process.env[contract.env], resolve(root, contract.sibling)].filter(Boolean)
  let sourceRoot

  for (const candidate of candidates) {
    try {
      await access(resolve(candidate, `protocols/${contract.files[0]}`))
      sourceRoot = candidate
      break
    } catch {}
  }

  if (!sourceRoot) {
    console.log(`${contract.env} checkout not found; using tracked protocol reference pages.`)
    continue
  }

  for (const name of contract.files) {
    const source = resolve(sourceRoot, 'protocols', name)
    const destination = resolve(root, 'en/reference', name)
    await access(source)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(source, destination)
    console.log(`Synced ${contract.sibling}/protocols/${name} -> en/reference/${name}`)
  }
}
