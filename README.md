# Gemini Arabic Reply — الرد العربي المتكامل لـ Gemini و Antigravity

إضافة (`Plugin`) متكاملة لبيئة **Antigravity / Gemini** (سواء في شات سطح المكتب أو في `CLI Agent`) تجمع بين فكرتي:
- **[Abo-Eyad/ClaudeCode-arabic](https://github.com/Abo-Eyad/ClaudeCode-arabic)**: التوجيه للرد باللغة العربية مع التفكير الداخلي بالإنجليزية لدقة وسرعة الكود، والكشف التلقائي عن الطرفيات (`Terminals`) التي لا تدعم `BiDi` لتشكيل الحروف وعكسها بصرياً عند الحاجة.
- **[MarcoElabd/arabic-mixed-order](https://github.com/MarcoElabd/arabic-mixed-order)**: تثبيت ترتيب الجمل العربية المختلطة بكلمات إنجليزية في الشات والطرفيات الداعمة لـ `BiDi` باستخدام محددات العزل ثنائي الاتجاه `U+2067` (`RLI`) في بداية الفقرة و `U+2069` (`PDI`) في نهايتها، مع منع انكسار الجملة بسبب التنسيقات المضمنة (`Inline Formatting`).

---

## المشكلة التي تحلها الإضافة / The Problem It Solves

1. **انقلاب ترتيب الجملة العربية عند وجود كلمات إنجليزية (Mixed Arabic-English Clause Swapping):**
   واجهة الشات ترسم الفقرات افتراضياً من اليسار لليمين (`LTR`). عند ظهور كلمة إنجليزية وسط جملة عربية، تنقسم الفقرة ويتبدل مكان الكلام العربي الذي قبل الكلمة الإنجليزية مع الكلام الذي بعدها.
   - **الحل:** إحاطة كل فقرة مختلطة (تحتوي على حروف عربية وحروف لاتينية معاً) بزوج واحد فقط من العلامات:
     - `U+2067` (`⁦`) في أول حرف من نص الفقرة.
     - `U+2069` (`⁩`) في آخر حرف من نص الفقرة.
   - **الدمج الذكي للتنسيقات (Smart Hybrid Formatting):** إبقاء الكلمات والمصطلحات الإنجليزية داخل الجملة العربية نصاً عادياً (`Plain Text`) بدون `backticks` أو `bold` أو روابط مضمنة حتى لا تنكسر مظلة `U+2067 ... U+2069`، مع وضع روابط الملفات القابلة للضغط (`Clickable Links`) والأوامر والـ `Code Blocks` في أسطر مستقلة تحت الفقرة.

2. **مشكلة الحروف المقطعة أو المعكوسة في بعض الطرفيات (Non-BiDi Terminals in CLI):**
   بعض الطرفيات مثل `VS Code Terminal` و `Alacritty` و `Kitty` و `Ghostty` لا تدعم خوارزمية `BiDi` العربية افتراضياً.
   - **الحل:** تكشف الإضافة تلقائياً نوع البيئة (`Auto-detect`):
     - في **شات Antigravity / IDE** وفي **Windows Terminal**: تستخدم الوضع المنطقي الأصلي (`native`) مع `U+2067 ... U+2069`.
     - في **طرفيات الـ CLI غير الداعمة لـ BiDi**: تفعل وضع `visual` وتوفر أداة `hooks/shape.mjs` لتشكيل الحروف (`Presentation Forms-B`) وإعادة ترتيب السطر بصرياً.

---

## هيكل الإضافة / Structure

```text
gemini-arabic-reply/
├── plugin.json                      # ملف تعريف الإضافة لـ Antigravity / Gemini
├── hooks.json                       # خطافات دورة الحياة (SessionStart & PreInvocation)
├── assets/
│   └── logo.svg                     # شعار الإضافة
├── rules/
│   ├── AGENTS.md                    # القواعد الدائمة لـ Antigravity / Gemini
│   └── mixed-order.mdc              # متوافق أيضاً مع Cursor
├── hooks/
│   ├── arabic-reply.mjs             # محرك الحقن التلقائي في بداية الجلسة ومع كل رسالة
│   ├── bidi.mjs                     # مكتبة تشكيل الحروف + خوارزمية UBA + عزل الفقرات المختلطة
│   ├── shape.mjs                    # أداة سطر أوامر لتنسيق أو تشكيل النصوص العربية
│   ├── settings.json                # إعدادات الإضافة القابلة للتخصيص
│   └── plugin.test.mjs              # اختبارات آلية شاملة
└── skills/
    └── arabic-formatting/
        └── SKILL.md                 # مهارة ضبط الإعدادات واختبار العرض
```

---

## التثبيت في Antigravity / Gemini

انسخ المجلد إلى مسار إضافات Gemini العام:

```powershell
Copy-Item -Recurse -Force ./gemini-arabic-reply "$HOME/.gemini/config/plugins/gemini-arabic-reply"
```

ثم أعد تشغيل Antigravity لاكتشاف الإضافة وتفعيل القواعد والـ Hooks تلقائياً.

---

## الإعدادات (`hooks/settings.json`)

| الإعداد | القيم المتاحة | القيمة الافتراضية | الوظيفة |
| :--- | :--- | :--- | :--- |
| `rtl` | `"auto"` / `"native"` / `"visual"` | `"auto"` | `auto` يستخدم `native` (`U+2067..U+2069`) في الشات وWindows Terminal، ويفعل `visual` في الطرفيات التي تقلب الحروف. |
| `thinking` | `"english"` / `"arabic"` | `"english"` | لغة التفكير الداخلي للوكيل. الإنجليزية أسرع وأدق برمجياً بينما تظل جميع الردود بالعربية. |
| `replyLanguage` | `"arabic"` / `"match"` | `"arabic"` | `arabic` يجعل الرد بالعربية دائماً؛ `match` يرد بالعربية عندما يكتب المستخدم بالعربية. |

---

## تشغيل الاختبارات / Running Tests

```powershell
node --test hooks/*.test.mjs
```

---

## الرخصة / License

MIT — انظر [LICENSE](LICENSE).
