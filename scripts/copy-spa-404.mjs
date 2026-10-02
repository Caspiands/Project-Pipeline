#!/usr/bin/env node
/**
 * Vercel serves 404.html for unknown paths. Copy index.html so client routes work
 * when platform rewrites are not applied.
 */
import fs from 'node:fs'
import path from 'node:path'

const dist = path.join(process.cwd(), 'dist')
const index = path.join(dist, 'index.html')
const notFound = path.join(dist, '404.html')

if (!fs.existsSync(index)) {
  console.error('copy-spa-404: dist/index.html not found — run vite build first')
  process.exit(1)
}

fs.copyFileSync(index, notFound)
console.log('copy-spa-404: dist/index.html → dist/404.html')
