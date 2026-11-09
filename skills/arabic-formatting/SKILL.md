---
name: arabic-formatting
description: Configure Arabic reply settings (RTL mode auto/native/visual, thinking language, reply language) or format/diagnose mixed Arabic-English text and terminal BiDi output.
---

# Arabic Formatting & Configuration Skill (`gemini-arabic-reply`)

Use this skill when the user asks to:
- Change `gemini-arabic-reply` settings (`rtl` mode: `auto` / `native` / `visual`, `thinking` language: `english` / `arabic`, or `replyLanguage`: `arabic` / `match`).
- Test or format mixed Arabic-English paragraphs with `U+2067` (`\u2067`) and `U+2069` (`\u2069`).
- Fix or preview visually shaped/reordered Arabic text for non-BiDi CLI terminals (`VS Code`, `Alacritty`, `Kitty`, `Ghostty`, `WezTerm`).

## 1. Updating Plugin Settings (`hooks/settings.json`)

Settings live in `hooks/settings.json` inside the plugin directory (`~/.gemini/config/plugins/gemini-arabic-reply/hooks/settings.json`):

```json
{
  "rtl": "auto",
  "thinking": "english",
  "replyLanguage": "arabic"
}
```

| Key | Allowed Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `rtl` | `"auto"` \| `"native"` \| `"visual"` | `"auto"` | `"auto"` uses `"native"` (`U+2067..U+2069`) in Desktop/IDE Chat and Windows Terminal, and switches to `"visual"` in non-BiDi CLI terminals. |
| `thinking` | `"english"` \| `"arabic"` | `"english"` | Internal reasoning language. `"english"` is faster and more accurate for code while keeping replies in Arabic. |
| `replyLanguage` | `"arabic"` \| `"match"` | `"arabic"` | `"arabic"` replies in Arabic always; `"match"` replies in Arabic when the user writes in Arabic. |

## 2. Mixed Arabic-English Paragraph Formatting (`U+2067 ... U+2069`)

Every paragraph or list item containing **both** Arabic and Latin characters must:
1. Start with `U+2067` (`⁦`) at the first character of the paragraph text and end with `U+2069` (`⁩`) at the last character.
2. Keep all English words inside the Arabic paragraph as **plain text** (no backticks, bold, or links inside the Arabic sentence).
3. Put clickable file links (`[file.ts](file:///...)`) and code snippets on standalone lines or code blocks outside the Arabic paragraph.

You can also format a file or string programmatically using `hooks/shape.mjs`:

```bash
node ~/.gemini/config/plugins/gemini-arabic-reply/hooks/shape.mjs --mode=mixed "عنوان الشات بقى BIM Work and Apps، والشغل هنا هيبقى خاص بـ BIM."
```

## 3. Terminal Visual Shaping (`shape.mjs`)

For terminals that display Arabic letters disconnected or left-to-right reversed:

```bash
node ~/.gemini/config/plugins/gemini-arabic-reply/hooks/shape.mjs --mode=visual --width=80 "مرحبا بك في Gemini CLI"
```
