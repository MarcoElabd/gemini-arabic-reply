// Bidirectional (BiDi) & Arabic shaping toolkit combining:
// 1. MarcoElabd/arabic-mixed-order: U+2067 (RLI) ... U+2069 (PDI) mixed paragraph isolation
// 2. Abo-Eyad/ClaudeCode-arabic: Arabic Presentation Forms-B shaping & visual UBA reordering for non-BiDi terminals

export const RLI = '\u2067' // Right-to-Left Isolate (U+2067)
export const PDI = '\u2069' // Pop Directional Isolate (U+2069)

// Joining class per letter, U+0621..U+063A then U+0641..U+064A, in the same order
// as their forms in U+FE80..U+FEF4: 1 = isolated only, 2 = right-joining, 4 = dual-joining.
const CLASSES = '12222424244444222244444444' + '4444444224'
const FORMS = new Map()
{
  let at = 0xfe80
  Array.from(CLASSES).forEach((c, i) => {
    const n = Number(c)
    FORMS.set(i < 26 ? 0x0621 + i : 0x0641 + i - 26, { at, n })
    at += n
  })
}

const TATWEEL = 0x0640
// لآ لأ لإ لا -> isolated form; final is +1
const LAM_ALEF = new Map([
  [0x0622, 0xfef5],
  [0x0623, 0xfef7],
  [0x0625, 0xfef9],
  [0x0627, 0xfefb],
])

const isMark = (c) => (c >= 0x064b && c <= 0x065f) || c === 0x0670
const joinsNext = (c) => c === TATWEEL || FORMS.get(c ?? -1)?.n === 4
const joinsPrev = (c) => c === TATWEEL || (FORMS.get(c ?? -1)?.n ?? 0) >= 2

export const hasArabic = (s) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)
export const hasLatin = (s) => /[A-Za-z]/.test(s)
export const isMixedParagraph = (s) => hasArabic(s) && hasLatin(s)

/**
 * Shapes logical Arabic letters into Unicode Presentation Forms-B for non-BiDi terminals.
 * Drops combining tashkeel marks since they land on the wrong cell once visually reversed.
 */
export function shape(text) {
  const cps = Array.from(text, (ch) => ch.codePointAt(0)).filter((c) => !isMark(c))
  const out = []
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i]
    const form = FORMS.get(c)
    if (!form) {
      out.push(c)
      continue
    }
    const prev = joinsNext(cps[i - 1])
    const lig = c === 0x0644 ? LAM_ALEF.get(cps[i + 1] ?? -1) : undefined
    if (lig) {
      out.push(lig + (prev ? 1 : 0))
      i++
      continue
    }
    const next = form.n === 4 && joinsPrev(cps[i + 1])
    const k = form.n === 1 ? 0 : prev && next ? 3 : prev ? 1 : next ? 2 : 0
    out.push(form.at + k)
  }
  return String.fromCodePoint(...out)
}

const dirOf = (ch) =>
  /[\u0660-\u0669\u06F0-\u06F9]/.test(ch)
    ? 'L'
    : /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch)
      ? 'R'
      : /[\p{L}\p{N}]/u.test(ch)
        ? 'L'
        : 'N'

const MIRROR = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
}

export const isRtl = (line) => Array.from(line).map(dirOf).find((d) => d !== 'N') === 'R'

/**
 * Reorders one already-shaped line from logical order into visual left-to-right cell order.
 */
export function reorder(line) {
  const chars = Array.from(line)
  const base = isRtl(line) ? 'R' : 'L'
  const dirs = chars.map(dirOf)
  for (let i = 0; i < dirs.length; ) {
    if (dirs[i] !== 'N') {
      i++
      continue
    }
    let j = i
    while (j < dirs.length && dirs[j] === 'N') j++
    const before = i > 0 ? dirs[i - 1] : base
    const after = j < dirs.length ? dirs[j] : base
    dirs.fill(before === after ? before : base, i, j)
    i = j
  }
  const runs = []
  chars.forEach((ch, i) => {
    const last = runs[runs.length - 1]
    const d = dirs[i]
    if (last && last.d === d) last.s.push(ch)
    else runs.push({ d, s: [ch] })
  })
  if (base === 'R') runs.reverse()
  return runs
    .map((r) => (r.d === 'R' ? r.s.reverse().map((c) => MIRROR[c] ?? c).join('') : r.s.join('')))
    .join('')
}

/**
 * Greedy word wrap to `width` terminal cells; words longer than `width` are sliced.
 */
export function wrap(line, width) {
  const out = []
  let cur = ''
  for (const word of line.split(' ')) {
    let w = word
    while (Array.from(w).length > width) {
      if (cur) {
        out.push(cur)
        cur = ''
      }
      out.push(Array.from(w).slice(0, width).join(''))
      w = Array.from(w).slice(width).join('')
    }
    const next = cur ? `${cur} ${w}` : w
    if (Array.from(next).length > width) {
      out.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  out.push(cur)
  return out
}

/**
 * Converts a logical line to visual lines for a non-BiDi terminal, right-aligning RTL lines.
 */
export function visualLines(line, width = 78) {
  const clean = line.replace(/[\u2066-\u2069\u202A-\u202E]/g, '')
  const shaped = shape(clean)
  const rtl = isRtl(shaped)
  return wrap(shaped, width).map((l) => {
    const v = reorder(l)
    return rtl ? v.padStart(width) : v
  })
}

/**
 * Detects terminals known to lack native Arabic shaping / BiDi support.
 * Native BiDi terminals (Windows Terminal, Konsole, GNOME Terminal, etc.) return false.
 */
export const lacksBidi = (env = {}) =>
  /^(vscode|wezterm|ghostty)$/i.test(env.TERM_PROGRAM ?? '') ||
  /kitty|alacritty/i.test(env.TERM ?? '') ||
  env.ALACRITTY_WINDOW_ID !== undefined

/**
 * Wraps a single mixed Arabic+Latin paragraph or list item once with U+2067 ... U+2069.
 * Leaves pure Arabic, pure English, or standalone code/link lines untouched.
 */
export function wrapMixedParagraph(line) {
  if (!line || !line.trim()) return line
  // Strip any existing directional isolate/embedding marks to avoid nested/duplicate pairs
  const stripped = line.replace(/[\u2066-\u2069\u202A-\u202E]/g, '')
  if (!isMixedParagraph(stripped)) return stripped

  // Preserve leading Markdown block markers (headings, bullets, numbered lists, blockquotes)
  const match = stripped.match(/^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s+)*)(.*)$/)
  if (!match) return `${RLI}${stripped}${PDI}`
  const [, prefix, body] = match
  if (!isMixedParagraph(body)) return stripped
  return `${prefix}${RLI}${body}${PDI}`
}

/**
 * Formats multi-line Markdown text so every mixed Arabic+Latin paragraph has a single
 * U+2067 ... U+2069 envelope while leaving fenced code blocks and pure-language paragraphs untouched.
 */
export function formatMixedMarkdown(text) {
  const lines = text.split(/\r?\n/)
  const out = []
  let inCodeFence = false
  for (const rawLine of lines) {
    if (rawLine.trimStart().startsWith('```')) {
      inCodeFence = !inCodeFence
      out.push(rawLine)
      continue
    }
    if (inCodeFence) {
      out.push(rawLine)
      continue
    }
    out.push(wrapMixedParagraph(rawLine))
  }
  return out.join('\n')
}
