# Eduh — Design System

## Design Philosophy

Dark mode only. Gemini-inspired aesthetic with soft pastel colors, subtle depth through surface layering and backdrop blurs, and smooth micro-animations. No hard borders by default — borders are transparent or very subtle (`rgba(255, 255, 255, 0.08)`).

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#131314` | Page background |
| Surface | `#1E1F20` | Cards, modals, dropdowns |
| Surface Hover | `#282A2C` | Hover state for surfaces |
| Border | `transparent` | Default — no visible borders |
| Border Subtle | `rgba(255, 255, 255, 0.08)` | Card borders, dividers |
| Border Hover | `rgba(255, 255, 255, 0.12)` | Hover border state |
| Primary Text | `#E3E3E3` | Headings, body text |
| Muted Text | `#C4C7C5` | Secondary text, placeholders |
| Accent Blue | `#A2C7FF` | Buttons, links, active states (soft pastel blue) |
| Accent Blue Hover | `#B4D1FF` | Button hover |
| Accent Surface | `rgba(162, 199, 255, 0.1)` | Blue-tinted background |
| Success Green | `#81C995` | Progress bars, completion |
| Danger Red | `#F28B82` | Delete buttons, errors |

Colors are defined as CSS variables in `src/app/globals.css` and exposed via Tailwind v4's `@theme inline` block. Available as utility classes: `bg-background`, `bg-surface`, `text-primary-text`, `text-accent-blue`, etc.

## Background

The body uses subtle fixed radial gradients for depth:
- Blue gradient at 15% 50% position with 5% opacity.
- Green gradient at 85% 30% position with 3% opacity.

## Typography

- **Font**: Geist Sans (body), Geist Mono (code).
- **Base weight**: 500.
- **Headings**: Weight 600, minimal size differences.
- **Body text**: 15px, leading-relaxed (1.6 line height).
- **Small text**: 12–13px for labels, badges, timestamps.
- **Color**: `primary-text` for main content, `muted-text` for secondary.

## Component Styles

### Buttons
- **Primary**: `bg-accent-blue`, `hover:bg-accent-blue-hover`, `text-background`. Rounded-full (pill shape).
- **Danger**: `bg-danger-red`, `opacity-90 on hover`.
- **Ghost**: Transparent, `hover:bg-surface-hover`.
- Padding: `px-5 py-2.5`. Font: 14px, medium weight. Active: `scale-95` press effect. 200ms transitions.
- Loading state with inline spinner. Disabled: `opacity-50`.

### Inputs
- `px-4 py-3`, `rounded-2xl`, 14px text.
- Background: `surface` with `border-subtle`.
- Focus: `accent-blue` border with ring.
- Error state: `danger-red` border.
- Disabled: `opacity-50`.

### Cards
- `bg-surface/60` with `backdrop-blur-sm`, `border border-border-subtle`, `rounded-2xl`, `p-5`.
- Hover (clickable): `bg-surface-hover/80`, `border-accent-blue/30`, `shadow-lg`, `-translate-y-0.5`.
- Shadow: `shadow-sm` at rest, `shadow-lg` on hover.
- 300ms transitions.

### Modals
- Portal-based, `z-50`.
- Backdrop: `bg-[#0F0F11]/80` with `backdrop-blur-sm`.
- Content: `bg-surface`, `border border-border-subtle`, `rounded-3xl`, `p-6`, `shadow-2xl`.
- Close: ESC key, click-outside, or X button.
- Animations: backdrop fade + content pop.

### Badges
Variants: default (`bg-white/10`), blue (`bg-accent-blue/20`), green (`bg-success-green/20`), red (`bg-danger-red/20`), muted (`bg-white/5`). All are `rounded-full`, `text-xs`, `px-2.5 py-0.5`.

### Checkboxes
Custom styled: `w-4 h-4`, `rounded`, `border border-border-subtle`. Checked: `bg-accent-blue`. Focus: `ring-1 ring-accent-blue/30`.

### Progress Bar
`h-2` (or `h-3` in studying view), `bg-white/10` container, `bg-success-green` fill, both `rounded-full`.

### Spinners
SVG-based, `text-accent-blue`, `animate-spin`, partial circle effect.

### Toasts
Bottom-right, auto-dismiss (4 seconds). Variants:
- Error: `bg-danger-red/10`, `border-danger-red/30`, `text-danger-red`.
- Success: `bg-success-green/10`, `border-success-green/30`, `text-success-green`.
- Info: `bg-white/5`, `border-border`, `text-muted-text`.
Rounded-2xl with backdrop-blur. Dismiss button on each toast.

## Animations

Subtle micro-animations are used throughout:
- **fade-in-up**: 0.4s cubic-bezier, `translateY(16px)` → 0. Used for messages, page sections.
- **modal-pop**: 0.3s cubic-bezier, `scale(0.96)` → 1. Used for modal content.
- **backdrop-fade**: 0.3s ease-out. Used for modal backdrop.
- **jumping-dots**: 1s infinite, `translateY(-4px)`. Used for tool-use indicator in chat.
- **pulsing-dots**: 1.4s infinite, opacity cycle. Used for loading indicators.

## Layout

### Navbar
Fixed top, `h-14`, `bg-background/80` with `backdrop-blur-md`, `border-b border-border-subtle`.
- Left: "Eduh" logo with gradient text (primary-text → accent-blue).
- Right: Avatar button (circle, `bg-white/10`) → dropdown menu (`bg-surface`, `rounded-2xl`).

### Breadcrumb
Fixed below navbar, `h-12`, same blur styling. Shows: Dashboard > Section > Topic. Section and topic names have navigation dropdowns.

### Content Area
`pt-22` (accounts for fixed navbar + breadcrumb), `max-w-7xl`, centered horizontally.

### Responsive
Desktop-first with responsive breakpoints. Dashboard grid: 3 → 2 → 1 columns. Topic timeline: vertical line hidden on mobile, smaller nodes.

## Page-Specific Design

### Auth Page
- Hero: large title (5xl/7xl) with gradient text, tagline in accent-blue, description in muted-text.
- Form: `bg-surface/80`, `backdrop-blur-xl`, `rounded-3xl`, prominent shadow.
- Three-step explanation section below with staggered fade-in-up animations.

### Uploading
- Upload zone: dashed border, `rounded-3xl`, drag state highlights with `border-accent-blue` and `scale-[1.02]`.
- File rows: `bg-surface`, `rounded-2xl`, with status badges.

### Planning
- Topic cards: `bg-surface`, `rounded-3xl`, `p-5`. Known topics: `opacity-50`.
- Inline editing: transparent input with accent-blue bottom border.
- Drag handles and add/delete buttons appear on hover.

### Studying
- Progress widget: `bg-surface/60`, `backdrop-blur-md`, `rounded-[32px]`.
- Timeline: vertical connecting line, numbered circle nodes with state-dependent styling (completed blue, next-to-study glowing blue, others neutral).
- Topic cards show subtopics as dot-listed items.

### Chat
- User messages: `bg-surface`, `rounded-3xl`, right-aligned bubble.
- AI messages: no bubble, left-aligned, rendered as prose (Markdown + LaTeX + code highlighting).
- Tool indicator: "Searching study materials" with jumping dots.
- Input: fixed bottom, `bg-surface/80`, `backdrop-blur-xl`, `rounded-[32px]`, gradient fade above.
- Send button: `rounded-full`, `bg-accent-blue`.
- Usage toasts: warning (info variant) at 75% / 90%, degradation info toast when the lighter model takes over, error toast with upgrade link when a free user hits the hard cutoff. Errored messages bounce back into the input area.

### Subscription Page
- **Navbar chip** (free users only): pill-shaped, `bg-accent-blue/20`, `text-accent-blue`, sits left of the profile button. Accent-blue hover state. Hidden for pro users.
- **Plan comparison**: two side-by-side cards (`bg-surface/60`, `backdrop-blur-sm`, `rounded-3xl`). Pro card has a faint accent-blue glow / border to signal it as the highlighted option. Free card emphasizes limits.
- **Pro status card**: shown instead of the subscribe button for pro users. Displays "You are Pro until [date]" in primary text with a small muted-text subtitle.
- **Balance display**: inline row with a coin/wallet icon and the balance in R$.
- **Promotions list**: grid of promotion cards (same surface styling as dashboard cards). Each card shows title + credit amount badge + "Claimed" badge if applicable. Clicking opens the detail modal.

### Payment Modal
- Standard modal surface (`bg-surface`, `rounded-3xl`). Three sequential states share the same shell:
  1. **Confirmation**: credits box at the top with a toggle ("Use my balance"). Disabled/greyed when balance is 0. Primary button at the bottom says either "Confirm subscription" (when credits cover the full price) or "Pay R$X.XX with Pix".
  2. **QR code**: large QR image centered, copy-paste PIX code directly below with a copy button, expiration countdown in muted text, short instructions at the bottom.
  3. **Success**: centered "You're now Pro!" with a Close button.
- Close (X) button top-right on all states. No destructive action on close — the QR just expires on its own.

### Promotion Detail Modal
- Title + description + optional progress copy ("2/5 friends invited").
- Primary action button at the bottom:
  - **Claim** (accent-blue) when eligible and unclaimed.
  - **Disabled** with an explanation line when the user hasn't met the criteria yet.
  - **"Already claimed"** label instead of a button when already redeemed.

## Empty States
All lists show a centered message guiding the user on what to do next (e.g., "No sections created yet. Click Create new Section to get started.").
