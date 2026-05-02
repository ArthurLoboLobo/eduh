---
register: product
---

# Product

## Register

product

The authenticated app is the primary surface and where users spend nearly all their time. The landing page at `/` is the only brand-register surface (design IS the product there — hero typography, scroll-driven sections), but it shares the same calm/academic tonal personality as the rest of the site. Default to `product` for everything; opt into brand register per task only for the landing page or future marketing surfaces.

## Users

**Brazilian university STEM students**, primarily engineering and CS at Unicamp and USP. Reached through the founder's personal network — Arthur is a 2nd-year CS at Unicamp.

**Context when they use Eduh:**
- Studying for a specific high-stakes test (P1, P2, finals) in the next 1–2 weeks.
- Late-night sessions, often tired, often stressed, often at 2am the day before the exam.
- Coursework is LaTeX-heavy and code-heavy. Materials are PDFs of past exams, slide decks, and lecture notes — sometimes scanned, sometimes typed.
- Already tried studying with ChatGPT/Gemini in a raw chat window and found it shapeless: no plan, no progress, no one checking if they understood.

**Job to be done:** turn a pile of course PDFs into a sequenced study plan and learn each topic well enough to pass a specific exam, with the AI grounded in *their* materials rather than improvising from training data.

## Product Purpose

Eduh replaces the blank LLM chatbox with a real study flow:

1. Upload course materials (past exams, slides, notes).
2. AI reads everything and generates a structured plan — ordered topics with subtopics — that the student can edit.
3. Student studies topic-by-topic. Each topic has its own chat that follows a pedagogical sequence: introduce → check understanding → worked example → student-solves-a-problem → next topic.
4. RAG over the uploaded materials means every explanation, example, and exercise is grounded in what the student will actually be tested on.

**Success looks like:** a section reaches the Studying phase, the student completes most topics.

**Explicitly NOT positioned as:** "AI Chat." That phrase is owned by ChatGPT/Gemini/NotebookLM in students' heads. The wedge is **pedagogical structure**, not "an AI you can talk to."

## Brand Personality

**One unified voice across the whole website — landing page through to the deepest study chat.** Calm, focused, academic. The library, not the dorm room. Quiet enough to study in for two hours straight without fatigue. Confident in its pedagogy without being clinical.

"Library" doesn't mean monastic. The site should feel **comfortable**, not austere — warm typography, generous spacing, color used with intention. White-text-on-black is a failure mode, not the goal. Think reading lamp, not fluorescent reading room.

**Three-word personality:** **grounded, structured, confident.** *Grounded* = answers come from the student's PDFs, not generic AI. *Structured* = there is always a plan, a next step, a position in the sequence. *Confident* = the tool knows what it's doing and trusts the student to do the work; it doesn't perform competence with bright colors or cheerful microcopy.

**Emotions to evoke:** confidence (you know what to study next), focus (no distractions during a study session), and quiet competence (the tool is working hard, but it's not asking you to admire it).

**Out of scope for this file:** the founder personally messaging friends in WhatsApp-style pt-BR ("tô fazendo um app...") is acquisition tactics, not brand voice — those messages live in `docs/marketing/messages.md` and never appear on the website itself. Don't import that tone into UI copy, landing-page hero, or marketing pages on the site.

## Anti-references

- **EdTech-cliché.** No mascots, no streaks, no achievement badges, no Duolingo-style "🔥 7-day streak" energy, no celebratory confetti, no cartoon illustrations. Progress is shown as topics-completed and timeline position, never as gamified rewards. Bright primary colors and saturated kid-friendly palettes are out.
- **Crowded SaaS dashboard (Notion / generic productivity).** No dense info-grids, no sidebar stacked with icons, no every-pixel-utilized "power-user" density, no command palettes for their own sake. The app is for one task at a time (read the plan, study a topic, chat) and the layout should reinforce that.
- **Implicit but worth naming:** don't drift into "ChatGPT/Claude/Gemini lookalike" either. The plan and timeline must visibly anchor the experience so the surface never collapses to "another chat app."

## Design Principles

1. **Grounded in your materials.** The user must always sense that the AI's answers come from *their* uploaded PDFs, not from generic AI knowledge. RAG citations, source chunks, and visual links between an explanation and the source material are first-class — not buried in a tooltip. When the AI is searching student materials, show it. When it quotes one, make the provenance obvious.

   **Why:** the entire wedge against ChatGPT collapses if students can't tell whether the AI is using their slides or making things up. Trust in provenance is what makes Eduh different from a generic LLM chat.

   **How to apply:** prefer designs that surface "this came from your materials" over designs that hide it. RAG-related UI (the `searchStudentMaterials` indicator, future citation chips) gets visual weight, not stylistic noise.

2. **Calm under cognitive load.** Students use Eduh tired, stressed, often the night before an exam. The app should feel like a quiet library: no lots of animations fighting for attention, no surprise modals, no toasts that punish you, no "engagement" patterns. The harder the user is working, the calmer the surface should be.

   **Why:** stimulation is the enemy of learning. Every UI element competing for cognitive bandwidth is bandwidth taken away from the actual work of understanding the material.

   **How to apply:** when in doubt, take something away. Default to no animation; reserve micro-motion for confirmation feedback only. Reach for inline state changes before modals. Toasts are reserved for things the user must know — not nudges, not tips, not upsells in the middle of a study session.

3. **Plan-first, not chat-first.** The plan and the topic timeline are the structural hero of the product. Chat is the working surface *inside* a topic, never the entry point. Layout, hierarchy, and navigation should always reinforce: there is a sequence, you have a position in it, here is what's next.

   **Why:** sourced directly from the project's own positioning (`docs/marketing/marketing.md`): *"Sell 'a better way to actually study.' The wedge is pedagogical structure... A plan, not a chat."* If the UI ever flattens to "open the app and chat," the differentiation against ChatGPT is gone.

   **How to apply:** any design that pushes the plan/timeline below the fold, or treats topics as a generic list of "conversations," is fighting the brand. Progress, sequence, and the connection between topic-and-its-place-in-the-plan should be visible without scrolling.

## Accessibility & Inclusion

Working baseline (not yet user-confirmed — flag as open):

- **WCAG AA contrast** for all text and interactive elements. The current pastel-blue accent on deep-charcoal background already passes for most pairings; commit to AA and audit any future palette changes against it.
- **Math and code rendering quality is an accessibility issue, not a polish item.** STEM students rely on KaTeX output and syntax-highlighted code being correct, copyable, and selectable. Treat regressions in `react-markdown` + `remark-math` + `rehype-katex` + `react-syntax-highlighter` as accessibility bugs.
- **Internationalization is part of accessibility for this audience.** pt-BR is default; English is secondary. The LLM language-priority rule (last user message > materials > preference) is a deliberate accessibility choice — students study in whatever language their materials are in.

**Open questions for the founder to confirm:**
- Should `prefers-reduced-motion` gate the existing micro-animations (`fade-in-up`, `modal-pop`, `jumping-dots`)?
- Light mode is currently out of scope (deliberate). Worth revisiting? Some users with astigmatism find dark-only harder, not easier.
- Any specific keyboard-navigation or screen-reader commitments worth making explicit?
