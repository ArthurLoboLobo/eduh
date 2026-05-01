---
name: Eduh
description: A university reading room after hours, in code.
colors:
  lamp-night: "#1a1614"
  desk-surface: "#231d1a"
  desk-surface-hover: "#2c2421"
  page-cream: "#ece5d6"
  page-cream-muted: "#c4baa6"
  page-cream-faint: "#9a8f7e"
  oxblood: "#7e3128"
  oxblood-bright: "#9d4337"
  oxblood-tint: "#7e312820"
  forest-success: "#5e8c6f"
  rust-danger: "#b65a36"
  brass-warning: "#d6a85a"
  hairline: "#ece5d629"
  code-surface: "#262a2c"
typography:
  display:
    fontFamily: "Newsreader, 'Source Serif 4', 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2.75rem, 7vw, 5rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Newsreader, 'Source Serif 4', 'Iowan Old Style', Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Newsreader, 'Source Serif 4', 'Iowan Old Style', Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  body-prose:
    fontFamily: "Newsreader, 'Source Serif 4', 'Iowan Old Style', Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  sm: "2px"
  md: "6px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.oxblood-bright}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.desk-surface-hover}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.rust-danger}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-field:
    backgroundColor: "{colors.desk-surface}"
    borderColor: "{colors.hairline}"
    focusBorderColor: "rgba(157, 67, 55, 0.58)"
    focusShadow: "0 0 0 1px rgba(157, 67, 55, 0.28), 0 0 12px -8px rgba(157, 67, 55, 0.64)"
    textColor: "{colors.page-cream}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  card:
    backgroundColor: "{colors.desk-surface}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.page-cream}"
    rounded: "{rounded.lg}"
    padding: "20px"
  modal-surface:
    backgroundColor: "{colors.desk-surface}"
    textColor: "{colors.page-cream}"
    rounded: "{rounded.xl}"
    padding: "28px"
  navbar:
    backgroundColor: "{colors.lamp-night}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    height: "56px"
  badge-default:
    backgroundColor: "{colors.desk-surface-hover}"
    textColor: "{colors.page-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-oxblood:
    backgroundColor: "{colors.oxblood-tint}"
    textColor: "{colors.oxblood-bright}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  code-block:
    backgroundColor: "{colors.code-surface}"
    textColor: "{colors.page-cream}"
    typography: "{typography.mono}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Eduh

## 1. Overview: The Carrel After Hours

**Creative North Star: "The Carrel After Hours"**

A carrel is the private study desk in a university library: a small wooden booth with a green-shaded reading lamp, surrounded by silence and the spines of borrowed books. Eduh is what that carrel looks like when a Unicamp student logs in to study at 11pm the night before a P1. Warm, dim, focused, structured by the rhythm of reading. The kind of room where you can sit for two hours without your eyes burning out.

The room is built from three materials. **Warm-dark wood-tone surfaces** (deep, slightly red-brown, never charcoal-cool) for the page and desk. **Warm-cream paper-tone text** (off-white shifted toward old-page yellow, never pure white). And a single quiet color of authority, **oxblood**, the leather binding of the textbook resting on the desk. Focus is shown through precise oxblood borders and hairlines.

Type does the academic work. **Newsreader serif** sets every heading, every topic title, every paragraph the AI hands back to you, the long-form "this is the lesson" register. **Inter sans** handles UI chrome (buttons, fields, labels) cleanly and unobtrusively. **JetBrains Mono** appears only where it should: code blocks and KaTeX inline. **Hairline cream rules** separate sections of the page the way a chapter rule separates chapters of a book.

This system explicitly rejects:
- **Gemini-clone aesthetic**, which the previous design pass inherited: cold charcoal `#131314`, pastel Gemini blue `#A2C7FF`, all-Geist typography. Cool tech-product styling does not match a library at night.
- **EdTech-cliché.** No mascots, streaks, achievement confetti. Progress is shown as topics-completed and timeline position, never as gamified rewards.
- **Crowded SaaS dashboard.** No information density for its own sake, no command palettes, no nested cards.
- **ChatGPT / Claude / Gemini lookalike.** The plan and topic timeline must visibly anchor the experience. The surface must never collapse to "another chat app."

**Key Characteristics:**
- Warm-dark only. Background is `oklch(0.155 0.008 30)`, a deep warm sepia near-black. No pure or cool charcoal.
- Single chromatic voice: oxblood (`oklch(0.46 0.13 20)`), used on under 10% of any visible screen.
- Newsreader serif for long-form and structural type, Inter for UI chrome, JetBrains Mono for code.
- Hairline cream rules at structural breaks. Otherwise borderless surface separation by tonal layering.
- Focus states use a restrained oxblood border glow.

## 2. Colors: The Carrel Palette

The palette is built from three materials of a university reading room: warm wood (dark-tinted toward red-brown), warm paper (cream-yellow), and oxblood leather. Status colors are warm-shifted so they sit naturally next to the leather: forest-olive for success, rust for danger, brass for warning.

### Primary
- **Oxblood** (`#7e3128` / `oklch(0.46 0.13 20)`): The single voice of action. Primary buttons, active state on the topic timeline, links inside AI explanations, the focused outline of the chat input. Tints active-row backgrounds at low opacity. Never used as a large fill: it is a *binding*, not a *cover*.
- **Oxblood Bright** (`#9d4337` / `oklch(0.56 0.16 22)`): The hover and focus state of any oxblood surface. Slightly lifted lightness, slightly more chroma, no shape change.
- **Oxblood Tint** (`#7e312820`, ~12% alpha): Background for selected and active list items, focus rings on inputs and buttons, hover surface for ghost buttons.

### Neutral
- **Lamp Night** (`#1a1614` / `oklch(0.155 0.008 30)`): The page background. Warm-tinted dark, far from cool charcoal. The room with the lamp turned down.
- **Desk Surface** (`#231d1a` / `oklch(0.21 0.01 30)`): Cards, modals, navbar, dropdown panels. The wood of the desk, slightly lifted from the room shadow.
- **Desk Surface Hover** (`#2c2421` / `oklch(0.255 0.012 30)`): The desk surface under direct interaction. Used on hover and selected surfaces.
- **Page Cream** (`#ece5d6` / `oklch(0.93 0.012 80)`): Primary text. Warm off-white, the color of an old library book's pages. Never pure white.
- **Page Cream Muted** (`#c4baa6` / `oklch(0.78 0.015 80)`): Secondary text. Descriptions, timestamps, placeholders.
- **Page Cream Faint** (`#9a8f7e` / `oklch(0.62 0.01 80)`): Tertiary text. File metadata, captions, "topics completed" labels.
- **Hairline** (`#ece5d629`, ~16% alpha cream): The structural rule line. Below section headings, between plan items, between chat messages and the input row. Also used as the very soft full border on card surfaces that need clearer separation from the page.

### Tertiary (Status)
- **Forest Success** (`#5e8c6f` / `oklch(0.62 0.09 150)`): Topic completion marks, progress fills, success toasts. Olive-leaning so it does not read as Gemini-pastel green.
- **Rust Danger** (`#b65a36` / `oklch(0.58 0.15 38)`): Delete affordances, error toasts, validation errors. Sits at hue 38 (orange-red), distinguishable from oxblood (hue 20).
- **Brass Warning** (`#d6a85a` / `oklch(0.78 0.12 80)`): Usage warnings (75% / 90% caps), intermediate states. The lamp's brass fitting.
- **Code Surface** (`#262a2c` / `oklch(0.22 0.005 240)`): Background for code blocks and KaTeX displays only. The single cool note in the room, by design, to mark "this is verbatim, not prose."

### Named Rules

**The One Voice Rule.** Oxblood is the only chromatic action color. Status colors (forest, rust, brass) communicate state, not interaction. If you find yourself reaching for forest or brass on a button, the system has lost its voice. Use oxblood and let weight or position do the rest.

**The No-White Rule.** Pure `#ffffff` and pure `#000000` are forbidden. All neutrals carry the warm hue. Page-cream replaces white. Lamp-night replaces black. White text on a dark surface is a Gemini-era failure mode, not a goal.

**The Cool-Code Rule.** The neutral-grey code surface is the only cool note in the palette. It exists so that a code block reads as a different register, the way an academic paper sets a code listing inside a frame. Cool tones must not leak anywhere else.

## 3. Typography

**Display Font:** Newsreader (with Source Serif 4, Iowan Old Style, Georgia, serif fallback)
**Body / UI Font:** Inter (with ui-sans-serif, system-ui fallback)
**Long-Form Prose Font:** Newsreader, used specifically for AI explanations and topic content
**Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** Newsreader is a screen-designed serif with the warmth of a printed book: humanist, slightly modulated, comfortable at long reading lengths. Inter is the most-tested UI sans available; here, it disappears into the chrome and lets Newsreader carry the brand personality. JetBrains Mono is the code voice, technical and even-width, made for STEM students.

### Hierarchy
- **Display** (Newsreader, 400, `clamp(2.75rem, 7vw, 5rem)`, line-height 1.05, letter-spacing -0.01em): The auth/landing page hero. Light weight despite the size. The size carries the weight; the type stays elegant.
- **Headline** (Newsreader, 500, 1.75rem, line-height 1.2): Section and topic page titles. The title bar of every authenticated page.
- **Title** (Newsreader, 500, 1.25rem, line-height 1.3): Card titles, modal titles, topic names in plan and timeline.
- **Body Prose** (Newsreader, 400, 1.0625rem / 17px, line-height 1.65): AI explanations in the chat stream, long-form topic content, plan descriptions. Capped at 65–75ch line length. **This is where the system feels academic.**
- **Body** (Inter, 400, 0.9375rem / 15px, line-height 1.55): UI body text. Modal copy, descriptions, dashboard subtitles.
- **Label** (Inter, 500, 0.8125rem / 13px, line-height 1.3, letter-spacing 0.01em): Buttons, badges, form labels, navbar, breadcrumb.
- **Mono** (JetBrains Mono, 400, 0.875rem / 14px, line-height 1.55): Inline code, code blocks, KaTeX inline `\texttt`.

### Named Rules

**The Two-Voice Rule.** Newsreader for *content the AI gives the student* (explanations, examples, worked solutions, topic titles, plan headings). Inter for *the affordances the student uses to navigate* (buttons, inputs, navbar, breadcrumbs, dashboard chrome). The serif makes "this is the lesson" feel like a textbook page; the sans makes "this is the tool" feel snappy. Mixing the two, sans on a topic title or serif on a button, breaks the voice.

**The 75ch Rule.** Body prose is capped at 75ch (~680px at 17px). Wider lines fatigue tired students faster than any other typography failure.

**The No-Gradient-Type Rule.** No `background-clip: text`. The previous "Eduh" wordmark with a page-cream-to-blue gradient is retired. Set the wordmark in solid page-cream, in Newsreader.

## 4. Elevation

The system is **flat by default**. Surfaces do not lift physically; they are separated by warm tonal layering, hairlines, and restrained focus borders. Desk-surface sits over lamp-night by lightness alone. Hairlines mark structural breaks where physical elevation would be heavier than the design wants. Modals are the main exception: they cheat with a soft warm shadow because they need to sit clearly above the dimmed page. Everything else stays grounded.

### Shadow Vocabulary
- **Input Focus Glow** (`border-color: rgba(157, 67, 55, 0.58); box-shadow: 0 0 0 1px rgba(157, 67, 55, 0.28), 0 0 12px -8px rgba(157, 67, 55, 0.64)`): The standard focus treatment for text inputs, textareas, and input-like containers. It keeps focus visible at the component edge.
- **Modal Lift** (`box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--hairline)`): Modal surfaces over the dimmed page. Soft, deep, low-chroma. The modal sits on the desk under the lamp; the rest of the room dims behind.
- **Focus Ring** (`box-shadow: 0 0 0 3px var(--oxblood-tint)`): Keyboard focus on buttons, checkboxes, and compact controls. Replaces the browser default outline. Text entry fields use the Input Focus Glow instead.

### Named Rules

**The Focus Edge Rule.** Inputs, textareas, auth forms, and chat composers use a border-color shift plus a small oxblood glow that stays tight to the component edge.

**The No-Lift Rule.** Cards do not raise off the page on hover. Hover changes the background (desk-surface → desk-surface-hover) and may bring an oxblood-tinted hairline. It does not add `translate-y`, scale, or shadow. Cards stay flat.

## 5. Components

### Buttons
- **Shape:** Rectangular with mild rounding (`6px`, the `md` token). No pill shapes. Pills are Material/Gemini-coded, not library-coded. Padding `10px 20px`, height ~38px at default size. Label typography (Inter 13px / 500 / +0.01em).
- **Primary (Oxblood):** `background: var(--oxblood)`, `color: var(--page-cream)`. The only chromatic button. Used once per page, on the dominant action ("Send code", "Start Planning", "Subscribe"). Hover shifts to `var(--oxblood-bright)`. Active applies a subtle inset shadow. No scale animation.
- **Secondary (Ghost):** `background: transparent`, `color: var(--page-cream)`, `border: 1px solid var(--hairline)`. Used for "Cancel", "Back", "Logout", and low-priority actions. Hover: `background: var(--desk-surface-hover)`.
- **Tertiary (Bare text):** `background: transparent`, `color: var(--page-cream-muted)`, no border. Used for inline navigation links and dropdown items. Hover: `color: var(--page-cream)`.
- **Danger:** Same shape as Primary. `background: var(--rust-danger)`. Used only in confirmation modals where the action is destructive. Never in primary-button position on a page.

### Inputs
- **Style:** `background: var(--desk-surface)`, `border: 1px solid var(--hairline)`, `rounded: 6px`, padding `12px 14px`. Body typography (Inter 15px / 400). Placeholder color: `var(--page-cream-faint)`.
- **Focus:** Border shifts to a restrained oxblood glow: `border-color: rgba(157, 67, 55, 0.58); box-shadow: 0 0 0 1px rgba(157, 67, 55, 0.28), 0 0 12px -8px rgba(157, 67, 55, 0.64)`. Background unchanged.
- **Error:** `box-shadow: 0 0 0 3px rgba(182, 90, 54, 0.25)` (rust-tint focus ring). Error message in `var(--rust-danger)` directly below the field.
- **Search:** Same shape, with a JetBrains Mono `/` keystroke hint inside, page-cream-faint, right-aligned.

### Cards / Containers
- **Corner Style:** `10px` (lg). No exception for "fancy" cards.
- **Background:** `var(--desk-surface)`. No backdrop-blur. The room is already shadowed.
- **Borders:** `1px solid var(--hairline)` at rest. The border should read as a soft edge, not a frame. A single internal hairline rule may appear below the card's title when the heading needs separation from the body.
- **Shadow:** Flat at rest. Hover sets `background: var(--desk-surface-hover)`, no shadow, no lift. Active states use oxblood borders, state nodes, or low-opacity tints.
- **Internal Padding:** `20px` default. `28px` for modal-class containers.

### Modals
- **Surface:** Same family as Card but `rounded: 14px`, padding `28px`, `box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--hairline)`.
- **Backdrop:** `background: rgba(26, 22, 20, 0.85)` (lamp-night at 85%) with `backdrop-filter: blur(2px)`. Very mild blur. The room dims, it does not fog. Backdrop fade in 0.3s.
- **Title:** Newsreader Title style. Hairline rule directly below the title, before the body.

### Navigation
- **Style:** `background: var(--lamp-night)`, full-width, height 56px, `border-bottom: 1px solid var(--hairline)`. Inter Label typography. No backdrop-blur. Flat against the page background.
- **Logo:** "Eduh" set in Newsreader, weight 500, page-cream. Solid color only.
- **Right cluster:** Avatar circle (32px, `bg-desk-surface`, page-cream initial). Dropdown opens a Card-styled panel with Tertiary-button items inside.
- **Breadcrumb row** (when present): below the navbar, height 48px, hairline border below. Inter Label type. Section and topic dropdowns open Card-styled panels.

### Topic Card (Signature Component)

The topic card in the studying timeline is the system's signature component:
- A leading **state node** (numbered circle, 24px, `border: 1.5px solid var(--page-cream-faint)`). Completed: `background: var(--forest-success)`, white check inside. Active (currently being studied): `background: var(--oxblood)`, page-cream number, plus a restrained oxblood border or low-opacity tint on the card.
- The **topic title** in Newsreader Title style.
- A **subtopic list** in Inter Body, page-cream-muted. Dot-separated when short, bulleted when long.
- A trailing **completion checkbox** (custom, `rounded: 4px`, oxblood when checked).
- A hairline rule between cards in the timeline, replacing the previous vertical connector. Bookish.

### Chat Input (Signature Component)

The bottom chat input on a topic page is the second signature surface:
- Single multi-line textarea, Body typography, `background: var(--desk-surface)`, `border: 1px solid var(--hairline)`, `rounded: 14px`, padding `14px 18px`.
- **Focus:** `:focus-within` applies the Input Focus Glow to the composer container. The glow stays at the border so the chat view remains clean while the user is composing.
- Send button at the right edge: oxblood circle (28px). `rounded-full` is permitted *only* here because it functions as an icon button. JetBrains Mono `↵` glyph in page-cream.
- Above the input, a soft gradient fade (lamp-night to transparent, 24px high) so the message stream visually recedes toward the bottom.

### Code Block
- **Surface:** `background: var(--code-surface)` (the only cool note in the palette). Padding `16px`, `rounded: 6px`, `border: 1px solid var(--hairline)`. Code is treated like a quotation block.
- **Type:** JetBrains Mono 14px / 400. Syntax highlighting uses muted warm tones (oxblood for keywords, brass for strings, page-cream for identifiers, page-cream-faint for comments).

### Badges
- **Style:** Padding `2px 10px`, `rounded: 9999px` (small inline label, the pill is functional, not decorative). Label typography. Variants by tinted background:
- **Default:** `background: rgba(236, 229, 214, 0.08)`, page-cream text.
- **Oxblood:** `background: var(--oxblood-tint)`, oxblood-bright text. Marks "Pro" status.
- **Forest:** Forest-success tint, forest text. "Claimed", "Completed".
- **Rust:** Rust-danger tint, rust text. "Failed", "Expired".

### Toasts
- **Position:** Bottom-right, max-width 360px.
- **Surface:** `background: var(--desk-surface)`, `rounded: 10px`, padding `14px 18px`, `border: 1px solid var(--hairline)`. No backdrop-blur, no transparency.
- **Variants:** Communicate state through a leading 16px icon (forest checkmark, rust alert, brass info-i) and a tinted background (forest-tint, rust-tint, brass-tint at ~12%). Never via a colored side stripe.

### Progress Bar
- **Style:** Height `6px` default, `8px` in studying view. `background: rgba(236, 229, 214, 0.08)`, `rounded: 9999px`. Fill: `var(--forest-success)`, `rounded: 9999px`. No animated stripes, no shimmer.

### Checkbox
- **Style:** 18px square, `rounded: 4px`, `border: 1.5px solid var(--page-cream-faint)`, `background: var(--desk-surface)`. Checked: `background: var(--oxblood)`, white check icon (inline SVG). Focus: oxblood-tint focus ring.

## 6. Do's and Don'ts

### Do
- **Do** use Newsreader for all AI-authored prose, all topic titles, and all plan headings. Inter for everything the user clicks, types, or navigates. JetBrains Mono only for code and KaTeX.
- **Do** use the restrained Input Focus Glow for text inputs, textareas, and chat composers. Focus should be visible at the border and quiet everywhere else.
- **Do** use Hairline rules at structural breaks, under section and topic headings, between chat messages and the input, between plan items. Bookish, like the rule under a chapter heading in a printed text.
- **Do** keep oxblood under 10% of any visible screen. It is the binding of the book, not the cover.
- **Do** warm-shift any new status color into the palette's hue family (10–80, or olive 140–155). A cool blue badge will scream against the rest.
- **Do** test layouts with real Brazilian Portuguese strings; pt-BR runs 15–25% longer than English. Layouts that feel tight in English break in pt-BR.
- **Do** cap body prose at 75ch.

### Don't
- **Don't** revive the Gemini-clone palette. No `#131314` charcoal, no `#A2C7FF` pastel blue. The previous direction is documented in `docs/design.md` for archival reference; it is not active.
- **Don't** use pure `#ffffff` text or `#000000` background anywhere. Page-cream replaces white. Lamp-night replaces black.
- **Don't** use side-stripe borders (a `border-left` or `border-right` greater than 1px as a colored accent). Forbidden across the system, including toasts and callouts. Use full hairline borders, tinted backgrounds, or leading icons.
- **Don't** use gradient text. The previous "Eduh" gradient logo is retired. Solid page-cream Newsreader.
- **Don't** add EdTech-cliché motifs: streaks, achievement badges, mascots, confetti, "🔥 7-day streak" energy, cartoon illustrations, kid-friendly saturated palettes. Progress shows as topics-completed and timeline position only.
- **Don't** drift into ChatGPT / Claude / Gemini lookalike. The plan and topic timeline must visibly anchor every authenticated screen. If a screen reduces to "open the app and chat," the brand line is broken.
- **Don't** add ambient micro-animations. Existing keyframes (fade-in-up, modal-pop, jumping-dots, pulsing-dots) stay only where they confirm a state change. No idle decoration.
- **Don't** use modals as a first thought. Inline disclosure, progressive forms, and contextual panels come first. Modals are reserved for hard interrupts (delete confirmation, payment QR).
- **Don't** lift cards on hover. Cards stay flat; hover changes background only.
- **Don't** use bright syntax-highlighting themes (Dracula, Synthwave, Monokai). Code is warm-muted with oxblood/brass/cream accents on the cool code-surface background.
- **Don't** use cards as the lazy answer to every grouping. Most page sections need a heading and a hairline rule, nothing more.
- **Don't** use em dashes in copy or in code comments destined for users. Commas, colons, periods, parentheses.
