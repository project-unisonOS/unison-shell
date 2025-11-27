import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert'

const root = process.cwd()

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
assert(pkg.name === 'unison-shell', 'package name should be unison-shell')
assert(pkg.main === 'main.js', 'main entry should be main.js')

const requiredFiles = ['main.js', 'preload.js', join('renderer', 'index.html')]
for (const file of requiredFiles) {
  const full = join(root, file)
  try {
    readFileSync(full)
  } catch {
    throw new Error(`Missing expected file: ${file}`)
  }
}

console.log('unison-shell smoke: ok')
