// Verifies every screenshot is within Upwork's 4000x4000 px upload limit.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'screenshots')
const LIMIT = 4000
let allOk = true
for (const file of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
  const buf = readFileSync(join(dir, file))
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  const ok = w <= LIMIT && h <= LIMIT
  if (!ok) allOk = false
  console.log(`${ok ? 'OK ' : 'BIG'}  ${file.padEnd(28)} ${w} x ${h}`)
}
console.log(allOk ? '\nAll screenshots within 4000x4000.' : '\nSome exceed the limit.')
process.exit(allOk ? 0 : 1)
