# Ditchy — UI & Design Specification

## Color Palette

| Token            | Value     | Usage                          |
| ---------------- | --------- | ------------------------------ |
| Background       | `#191B1F` | Page background                |
| Surface          | `#21242B` | Cards, modals, dropdowns       |
| Border           | `#2D3140` | Card borders, dividers         |
| Border Hover     | `#3A3F52` | Subtle lighter border on hover |
| Primary Text     | `#E4E6EB` | Headings, body text            |
| Muted Text       | `#8B90A0` | Secondary text, placeholders   |
| Accent Blue      | `#2B5CE6` | Buttons, links, active states  |
| Accent Blue Hover| `#3451D1` | Button hover                   |
| Success Green    | `#3D8B5E` | Progress bars, completion      |
| Danger Red       | `#D94444` | Delete buttons, destructive actions |

Dark mode only. No light mode.

## Typography

- Font family: **Geist**
- Keep sizing and weight minimal and consistent — headings use weight, not excessive size differences.

## General Component Style

- **Corners**: Slightly rounded (small border-radius, not pill-shaped).
- **Cards**: Flat with `#2D3140` border, no shadow at rest. On hover: a very subtle shadow or slightly lighter border (`#3A3F52`) to indicate interactivity.
- **Buttons**: Slightly rounded corners. Primary buttons use accent blue background. Destructive buttons use danger red.
- **Modals**: Surface-colored overlay panel, centered, with a dimmed backdrop.
- **Spinners**: Used for all loading states (no skeleton loaders).
- **Animations**: None. Keep the UI static — no transitions or motion effects.
- **Toasts/notifications**: None.
- **Empty states**: All lists (sections, files, messages, etc.) should show a short notice when empty, guiding the user on what to do next (e.g., "No sections created yet. Click Create new Section to get started.").

## Layout

- **Max width**: Content area has a max width that uses almost all of the viewport, but not 100%. Centered horizontally.
- **Mobile**: Primarily a desktop web app, but should be usable on mobile (responsive layout, no separate mobile design).

## Navigation

### Top Navbar
- Slim, fixed at the top.
- **Left side**: Logo (placeholder: text "Ditchy" for now; a logo icon will be placed next to it later).
- **Right side**: Profile avatar.
  - Clicking the avatar opens a dropdown menu containing:
    - **Change Language** — clicking it reveals the language options inline within the dropdown.
    - **Logout**

### Breadcrumb Bar
- Positioned below the navbar.
- Shows the current location and acts as a navigator.
- Format: `Dashboard > [Section Name ▾] > [Topic Name ▾]`
- Clicking `▾` next to a section name opens a simple dropdown listing all the user's sections to jump to.
- Clicking `▾` next to a topic name opens a simple dropdown listing all topics in that section (regardless of completion), to jump directly to any topic's chat.
- Dropdowns are simple text lists — no extra info like badges or status.

## Page-Specific UI

### Dashboard

- **Top area**: Search bar (left) + "Create new Section" button (right).
- **Section grid**: 3 columns by default, responsive (fewer columns on smaller screens).
- **Section card** contains:
  - Section name and description
  - Creation date
  - Status badge: `Uploading`, `Planning`, or `Studying`
  - Progress indicator (e.g., "3/8 topics completed") — only shown when status is `Studying`
  - Delete button — triggers a confirmation modal ("Are you sure?" with Cancel and Confirm buttons)
- Clicking a card navigates to the section page.

### Section — Uploading

- **File upload zone**: Dashed border area. Supports drag-and-drop. Clicking the zone also opens the system file picker.
- **File list**: Each uploaded file shows:
  - File name
  - Status label: `Uploading` → `Processing` → `Processed`
  - Click to preview the file (opens in a **modal overlay**)
  - Remove button to delete the file from the section
- **"Start Planning" button**: Appears when all uploaded files are processed. Clicking it transitions the section to the Planning status and disables further uploads.

### Section — Planning

- **Loading state**: A spinner with a notice ("Creating your study plan...") while the LLM generates the plan. No progress bar (plan generation is a single AI call).
- **Study plan display**: A vertical list of topic cards, each always showing all its subtopics (no collapse/expand).
- **Topic card**:
  - Drag handle on the left side for reordering.
  - Topic title — editable on click (appears when hovering over the title).
  - "Already Known" checkbox in the top-right corner. Marking it dims the entire card visually (same appearance as completed topics in the Studying phase — they start as completed).
  - Trash button — appears on hover over the card. Deletes the topic and all its subtopics.
  - Subtopics listed inside the card:
    - Each subtopic text is editable on click (appears when hovering).
    - Trash button on each subtopic — appears on hover.
    - Subtopics are reorderable via drag-and-drop within their parent topic.
    - "+" button below the last subtopic — appears on hover over the card. Creates a new empty subtopic at the end.
- **"+" button** below all topic cards: Creates a new empty topic at the end of the list.
- **Undo button**: Positioned at the top-right, just above the plan. Applies to all editing actions (deletes, edits, reorders, creation, etc.). No redo.
- **"Regenerate Plan" button**: Below the plan or in a prominent position. Clicking it reveals a required guidance text box **inline below the button**. The confirm button is disabled until the user types something (e.g., "Focus more on calculus").
- **"Start Studying" button**: Finalizes the plan and transitions the section to the Studying status.

### Section — Studying

- **Top area**: Progress indicator showing overall completion (e.g., "3/8 topics completed") with a progress bar using `#3D8B5E` green.
- **Topic card list**: Vertical list of cards, each containing:
  - Topic title
  - Completion checkbox (top-right corner) — toggleable at any time
  - Number of interactions (the number of messages the user sent in this topic's chat)
  - Completed/known topics appear **dimmed**
- Clicking a topic card navigates to the topic's AI chat page.
- **Revision chat**: A special card at the end of the list for general questions across all topics.

### Topic Chat

- **Style**: Similar to ChatGPT.
  - User messages: Inside a bubble, aligned to the right.
  - AI messages: No bubble, aligned to the left. No avatar or icon — just a color/label difference.
- **Undo button (↩)**: Appears **on hover** next to the user's sent message. Clicking it reverts the conversation to the point right before that message and places the message text back in the input box.
- **Rendering**: Supports LaTeX (both inline `$...$` and block `$$...$$`), Markdown, and syntax-highlighted code blocks.
- **Input area**:
  - Starts as a single-line text field.
  - Grows in height as the user types more lines, up to a maximum height, after which it gains a scrollbar.
  - **Enter** sends the message. **Shift+Enter** inserts a new line.
  - A **send button** is also visible next to the input field.
- **Initial message**: When the chat has no messages, the AI sends an introductory message about the topic and asks the user to confirm before starting.
