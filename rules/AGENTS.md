# Gemini Arabic Reply & Mixed-Order Rules

## 1. Language & Reasoning Behavior
- Always reply to the user in Arabic (Modern Standard Arabic, or the Arabic dialect the user writes in, such as Egyptian Arabic).
- Perform your internal reasoning / thinking in English for speed, lower token cost, and technical accuracy, while keeping every user-facing reply in Arabic.
- Prefer bullet lists over Markdown tables when replying in Arabic so columns do not misalign across RTL/LTR boundaries.

## 2. Arabic Display & Mixed Sentence Order (`U+2067 ... U+2069`)
- Write every chat reply in normal logical Arabic. Do not reverse letters and do not output Unicode Arabic Presentation Forms (`U+FE80..U+FEFC`) in desktop/IDE chat.
- The desktop and web chat layout renders paragraphs left-to-right (`LTR`) by default. In an `LTR` paragraph, every Latin/English word acts as a directional split, causing the Arabic clause before that English word to swap places with the Arabic clause after it.
- To lock the paragraph base direction to Right-to-Left (`RTL`), apply this rule to **every paragraph that contains both Arabic letters and Latin letters**, however long it is and however many Latin words it has:
  1. Put `U+2067` (`⁦`, Right-to-Left Isolate) at the first character of the paragraph text and `U+2069` (`⁩`, Pop Directional Isolate) at the last character of the paragraph text.
  2. One single pair (`U+2067` at the start, `U+2069` at the end) covers the whole paragraph. Never place `U+2069` in the middle of a paragraph, and never wrap individual words separately.
  3. Write words in normal logical order. Never use legacy `U+202B` or `U+202C`.
  4. A bullet item (`- ...`), numbered item (`1. ...`), or heading (`### ...`) is its own paragraph. Mark each mixed item with its own `U+2067 ... U+2069` pair placed immediately around the item text (after the `- `, `1. `, or `### ` marker so Markdown list/heading syntax still parses properly).
  5. A reply with several mixed paragraphs needs one `U+2067 ... U+2069` pair per mixed paragraph, including the first.
  6. Leave any paragraph that is **only Arabic**, **only English**, or a **fenced code block** unwrapped.

## 3. Smart Hybrid Rule for English Words, Code, and Clickable Links
- Backticks (`` `code` ``), bold (`**bold**`), italics (`*text*`), and inline links (`[text](url)`) create isolated HTML elements that split the directional run and prevent the outer `U+2067 ... U+2069` marks from keeping the Arabic sentence in order.
- **Inside a mixed Arabic paragraph**: Keep every Latin/English word (technical terms, function names, class names, variables, package names, and file names mentioned inside the sentence) as **plain text**. Do not wrap a Latin word inside an Arabic paragraph in backticks, bold, or a link.
- **Standalone Lines for Clickable Links & Code**: Whenever you need to provide clickable file/symbol links (`[file.ts](file:///path/to/file.ts)`), shell commands, or code snippets, place them on **their own dedicated standalone line, separate English-only bullet item, or fenced code block** outside the mixed Arabic sentence.

### Examples

**Example 1 — Mixed paragraph with several English words (plain text inside, one `U+2067 ... U+2069` pair around the whole paragraph):**

⁦عنوان الشات بقى BIM Work and Apps، والشغل هنا هيبقى خاص بـ BIM: النمذجة، التطبيقات، وسير العمل.⁩

**Example 2 — Mixed explanation + clickable file link and command on standalone lines (Smart Hybrid):**

⁦تم تعديل الدالة createUser داخل ملف auth.ts لمعالجة الأخطاء قبل حفظ البيانات في قاعدة البيانات، ويمكنك مراجعة الملف وتشغيل الاختبارات من السطور التالية:⁩

- [`auth.ts`](file:///path/to/auth.ts)

```bash
npm test
```
