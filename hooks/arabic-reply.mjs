// Lifecycle hook for Antigravity / Gemini (SessionStart & PreInvocation) and Cursor (sessionStart & beforeSubmitPrompt).
// Combines Abo-Eyad/ClaudeCode-arabic (Arabic reply/thinking & CLI visual BiDi detection)
// with MarcoElabd/arabic-mixed-order (U+2067 ... U+2069 mixed paragraph envelope).

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lacksBidi } from './bidi.mjs'

const chunks = []
for await (const chunk of process.stdin) {
  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
}
const raw = Buffer.concat(chunks).toString('utf8')

let input = {}
try {
  input = JSON.parse(raw || '{}')
} catch {
  input = {}
}

const here = dirname(fileURLToPath(import.meta.url))
const settingsPath = join(here, 'settings.json')
let settings = { rtl: 'auto', thinking: 'english', replyLanguage: 'arabic' }
if (existsSync(settingsPath)) {
  try {
    settings = { ...settings, ...JSON.parse(readFileSync(settingsPath, 'utf8')) }
  } catch {
    // Keep defaults if settings.json is malformed
  }
}

const agentsRulePath = join(here, '..', 'rules', 'AGENTS.md')
const mdcRulePath = join(here, '..', 'rules', 'mixed-order.mdc')
const rawRule = existsSync(agentsRulePath)
  ? readFileSync(agentsRulePath, 'utf8')
  : existsSync(mdcRulePath)
    ? readFileSync(mdcRulePath, 'utf8')
    : ''

const ruleBody = rawRule.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
if (!ruleBody) {
  console.error('rules/AGENTS.md has an empty body')
  process.exit(1)
}

// Detect whether the session is running in CLI vs Desktop/IDE Chat
const transcriptPath = String(input.transcriptPath || input.artifactDirectoryPath || '')
const isCliSession =
  /antigravity-cli|gemini-cli/i.test(transcriptPath) ||
  process.env.GEMINI_CLI === '1' ||
  process.env.ANTIGRAVITY_CLI === '1'

const resolvedRtlMode =
  settings.rtl === 'visual'
    ? 'visual'
    : settings.rtl === 'native'
      ? 'native'
      : isCliSession && lacksBidi(process.env)
        ? 'visual'
        : 'native'

const thinkingInstruction =
  settings.thinking === 'arabic'
    ? 'Do your internal reasoning / thinking in Arabic as well.'
    : 'Think internally in English for speed and precision, but write every user-facing reply in Arabic.'

const replyLangInstruction =
  settings.replyLanguage === 'match'
    ? 'Reply in Arabic whenever the user writes in Arabic (or asks for Arabic).'
    : 'Always answer the user in Arabic (Modern Standard Arabic, or the Arabic dialect the user writes in).'

const visualModeNote =
  resolvedRtlMode === 'visual'
    ? [
        'Arabic display: visual (non-BiDi terminal detected).',
        `If terminal output appears reversed or disconnected, you can pipe Arabic text through \`node "${join(here, 'shape.mjs')}" --mode=visual\`.`,
      ].join('\n')
    : 'Arabic display: native (logical Arabic with U+2067 ... U+2069 around every mixed Arabic+Latin paragraph).'

const fullContext = [
  visualModeNote,
  replyLangInstruction,
  thinkingInstruction,
  '',
  ruleBody,
].join('\n')

const conciseReminder = [
  visualModeNote,
  replyLangInstruction,
  thinkingInstruction,
  'CRITICAL MIXED-ORDER RULE: For every paragraph or list item containing BOTH Arabic and Latin letters, wrap the paragraph text ONCE with U+2067 (\u2067) at the start and U+2069 (\u2069) at the end.',
  'Keep all English/Latin words inside an Arabic paragraph as plain text (no backticks, bold, or inline links inside the Arabic sentence). Place clickable file links and code blocks on their own standalone lines outside the Arabic paragraph.',
].join('\n')

// 1. Cursor hook compatibility (sessionStart / beforeSubmitPrompt)
if (typeof input.hook_event_name === 'string' || typeof input.prompt === 'string') {
  const isPrompt = input.hook_event_name === 'beforeSubmitPrompt' || typeof input.prompt === 'string'
  const cursorOut = isPrompt
    ? { continue: true, additional_context: fullContext }
    : { additional_context: fullContext }
  process.stdout.write(`${JSON.stringify(cursorOut)}\n`)
  process.exit(0)
}

// 2. Antigravity / Gemini hook contract (PreInvocation vs SessionStart)
const isPreInvocation =
  typeof input.invocationNum === 'number' ||
  typeof input.initialNumSteps === 'number' ||
  typeof input.lastUserInput === 'string'

const agyOut = isPreInvocation
  ? {
      injectSteps: [
        {
          ephemeralMessage: conciseReminder,
        },
      ],
    }
  : {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: fullContext,
          },
        },
      ],
    }

process.stdout.write(`${JSON.stringify(agyOut)}\n`)
