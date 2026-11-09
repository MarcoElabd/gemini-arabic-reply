#!/usr/bin/env node
// CLI helper for formatting Arabic text:
// - Default / --mode=visual: shapes & reorders Arabic lines for non-BiDi terminals (ClaudeCode-arabic style)
// - --mode=mixed: wraps mixed Arabic+English paragraphs with U+2067 ... U+2069 (arabic-mixed-order style)

import { formatMixedMarkdown, hasArabic, visualLines } from './bidi.mjs'

const args = process.argv.slice(2)
const modeArg = args.find((a) => a.startsWith('--mode='))?.split('=')[1]
const widthArg = Number(args.find((a) => a.startsWith('--width='))?.split('=')[1] || process.stdout.columns || 80) - 2
const textArgs = args.filter((a) => !a.startsWith('--'))

async function readStdin() {
  if (process.stdin.isTTY && textArgs.length > 0) return textArgs.join(' ')
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const input = await readStdin()
const mode = modeArg || 'visual'

if (mode === 'mixed') {
  process.stdout.write(formatMixedMarkdown(input))
} else {
  const width = Math.max(20, widthArg)
  const out = []
  let inCode = false
  for (const raw of input.split(/\r?\n/)) {
    if (raw.trimStart().startsWith('```')) {
      inCode = !inCode
      out.push(raw)
      continue
    }
    if (inCode || !hasArabic(raw)) {
      out.push(raw)
      continue
    }
    const line = raw
      .replace(/^#{1,6}\s+/, '')
      .replace(/^(\s*)[-*+]\s+/, '$1• ')
      .replace(/\*\*|__|`/g, '')
    out.push(...visualLines(line, width))
  }
  process.stdout.write(`${out.join('\n')}\n`)
}
