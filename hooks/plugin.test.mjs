import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  formatMixedMarkdown,
  hasArabic,
  hasLatin,
  isMixedParagraph,
  isRtl,
  lacksBidi,
  PDI,
  reorder,
  RLI,
  shape,
  visualLines,
  wrapMixedParagraph,
} from './bidi.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

test('bidi.mjs: detects Arabic, Latin, and mixed paragraphs', () => {
  assert.equal(hasArabic('مرحبا'), true)
  assert.equal(hasArabic('Hello'), false)
  assert.equal(hasLatin('Hello'), true)
  assert.equal(hasLatin('مرحبا'), false)
  assert.equal(isMixedParagraph('شرح دالة createUser بالتفصيل'), true)
  assert.equal(isMixedParagraph('فقرة عربية خالصة بدون إنجليزي'), false)
  assert.equal(isMixedParagraph('Pure English paragraph only'), false)
})

test('bidi.mjs: wraps mixed paragraphs once with U+2067 ... U+2069', () => {
  const mixed = 'عنوان الشات بقى BIM Work and Apps، والشغل هنا هيبقى خاص بـ BIM.'
  const wrapped = wrapMixedParagraph(mixed)
  assert.equal(wrapped.startsWith(RLI), true)
  assert.equal(wrapped.endsWith(PDI), true)
  assert.equal(wrapped, `${RLI}${mixed}${PDI}`)

  // Calling wrapMixedParagraph again does not duplicate U+2067 / U+2069
  assert.equal(wrapMixedParagraph(wrapped), wrapped)

  // Pure Arabic and Pure English remain unwrapped
  const pureAr = 'هذه جملة عربية فقط لا تحتوي على كلمات أجنبية.'
  const pureEn = 'This is an English-only sentence.'
  assert.equal(wrapMixedParagraph(pureAr), pureAr)
  assert.equal(wrapMixedParagraph(pureEn), pureEn)
})

test('bidi.mjs: preserves Markdown bullet and heading prefixes outside U+2067', () => {
  const bullet = '- تعديل ملف auth.ts لإصلاح المشكلة'
  assert.equal(wrapMixedParagraph(bullet), `- ${RLI}تعديل ملف auth.ts لإصلاح المشكلة${PDI}`)

  const numbered = '1. تشغيل أمر npm test بعد التعديل'
  assert.equal(wrapMixedParagraph(numbered), `1. ${RLI}تشغيل أمر npm test بعد التعديل${PDI}`)

  const heading = '### إعدادات Gemini API الأساسية'
  assert.equal(wrapMixedParagraph(heading), `### ${RLI}إعدادات Gemini API الأساسية${PDI}`)
})

test('bidi.mjs: formatMixedMarkdown skips fenced code blocks', () => {
  const md = [
    'فقرة عربية فقط.',
    'فقرة مختلطة فيها React مع TypeScript.',
    '```ts',
    '// تعليق داخل الكود مع const x = 1',
    '```',
  ].join('\n')

  const formatted = formatMixedMarkdown(md).split('\n')
  assert.equal(formatted[0], 'فقرة عربية فقط.')
  assert.equal(formatted[1], `${RLI}فقرة مختلطة فيها React مع TypeScript.${PDI}`)
  assert.equal(formatted[3], '// تعليق داخل الكود مع const x = 1')
})

test('bidi.mjs: shapes Arabic letters and Lam-Alef ligatures and reorders visual lines', () => {
  // 'سلام' -> 'س' + 'لا' (single ligature U+FEFC) + 'م' = 3 codepoints
  const shaped = shape('سلام')
  assert.equal(shaped.length, 3)
  assert.equal(isRtl(shaped), true)

  const lamAlef = shape('لا')
  assert.equal(lamAlef.codePointAt(0), 0xfefb)

  const reordered = reorder(shape('كتاب (1)'))
  assert.equal(reordered.includes('(1)'), true)

  const vLines = visualLines('مرحبا بك', 20)
  assert.equal(vLines.length, 1)
  assert.equal(Array.from(vLines[0]).length, 20)
})

test('bidi.mjs: detects terminals lacking native BiDi', () => {
  assert.equal(lacksBidi({ TERM_PROGRAM: 'vscode' }), true)
  assert.equal(lacksBidi({ TERM_PROGRAM: 'WezTerm' }), true)
  assert.equal(lacksBidi({ TERM: 'xterm-kitty' }), true)
  assert.equal(lacksBidi({ ALACRITTY_WINDOW_ID: '123' }), true)
  assert.equal(lacksBidi({ TERM_PROGRAM: 'Windows_Terminal' }), false)
})

test('arabic-reply.mjs: outputs Antigravity SessionStart and PreInvocation injectSteps JSON', () => {
  const hookScript = join(here, 'arabic-reply.mjs')

  // 1. SessionStart payload
  const startRes = spawnSync('node', [hookScript], {
    input: JSON.stringify({
      conversationId: 'test-conv',
      transcriptPath: 'C:/Users/User/.gemini/antigravity/brain/test/transcript.jsonl',
    }),
    encoding: 'utf8',
  })
  assert.equal(startRes.status, 0)
  const startJson = JSON.parse(startRes.stdout)
  assert.ok(Array.isArray(startJson.injectSteps))
  assert.ok(startJson.injectSteps[0].systemMessage.systemMessage.includes('U+2067'))

  // 2. PreInvocation payload
  const preRes = spawnSync('node', [hookScript], {
    input: JSON.stringify({
      conversationId: 'test-conv',
      invocationNum: 2,
      lastUserInput: 'اشرح الكود',
    }),
    encoding: 'utf8',
  })
  assert.equal(preRes.status, 0)
  const preJson = JSON.parse(preRes.stdout)
  assert.ok(Array.isArray(preJson.injectSteps))
  assert.ok(preJson.injectSteps[0].ephemeralMessage.includes('U+2067'))

  // 3. Cursor compatibility payload
  const cursorRes = spawnSync('node', [hookScript], {
    input: JSON.stringify({
      hook_event_name: 'beforeSubmitPrompt',
      prompt: 'اشرح الكود',
    }),
    encoding: 'utf8',
  })
  assert.equal(cursorRes.status, 0)
  const cursorJson = JSON.parse(cursorRes.stdout)
  assert.equal(cursorJson.continue, true)
  assert.ok(cursorJson.additional_context.includes('U+2067'))
})

test('plugin manifests and rules are valid', () => {
  const pluginManifest = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8'))
  assert.equal(pluginManifest.name, 'gemini-arabic-reply')

  const rootHooks = JSON.parse(readFileSync(join(root, 'hooks.json'), 'utf8'))
  assert.ok(rootHooks['gemini-arabic-reply'].SessionStart)
  assert.ok(rootHooks['gemini-arabic-reply'].PreInvocation)

  const agentsMd = readFileSync(join(root, 'rules', 'AGENTS.md'), 'utf8')
  assert.equal(agentsMd.startsWith('---'), false, 'AGENTS.md must not have YAML frontmatter')
  assert.ok(agentsMd.includes('U+2067'))
  assert.ok(agentsMd.includes('U+2069'))
})
