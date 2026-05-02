# What is Eduh?

Eduh is a platform that helps university students prepare for exams using AI. The goal is to prepare for a specific exam. Users upload study materials, the AI generates a structured study plan, and then provides interactive tutoring through topic-specific chats.

## User Flow

### Register / Login

The root page (`/`) is both the landing page and the auth page. It has a hero section with a description of the platform on the left, and the auth form on the right.

1. The user enters their email address.
2. A one-time 6-digit code is sent via email.
3. The form transitions to show a code input field.
4. After entering the correct code, the user is authenticated and redirected to the dashboard.
5. If the user is already logged in, they are redirected straight to the dashboard.
6. Sessions last 30 days.
7. A standalone language switcher (PT | EN) is at the top-right of the page since there is no navbar on the auth page.

Below the hero section, three illustrated steps explain how the platform works (Upload → Plan → Study).

### Dashboard

The dashboard shows all sections the user has created in a responsive grid (3 columns desktop, 2 medium, 1 small).

- **Top bar**: Search input to filter sections by name + "Create new Section" button.
- **Each section card** shows:
  - Section name.
  - Creation date.
  - Status badge: Uploading, Planning, or Studying.
  - Progress indicator (e.g., "3/8 topics completed") — only when status is Studying.
  - Delete button (trash icon) that opens a confirmation dialog.
- **Empty state**: A centered message guiding the user to create their first section.
- **Create section**: Opens a modal with a name field.
- Clicking a card navigates to the section page.

### Section Page

A section has three phases: **Uploading**, **Planning**, and **Studying**. Each phase has a completely different interface. The phase is determined by the section's `status` field.

#### Uploading

The user uploads study materials — past exams, slides, notes, or anything relevant to help the AI understand what to teach.

- **Upload zone**: Dashed-border area supporting drag-and-drop and click-to-browse. Visual feedback when dragging files over.
- **File list**: Each uploaded file shows:
  - File name (clickable to preview in a modal: PDF in iframe, images displayed, unsupported types show a message).
  - Status: Uploading → Processing → Processed (or Error).
  - Delete button.
  - Retry button (for files with error status).
- **Processing**: After upload, each file is automatically sent to the AI for text extraction. The client polls for status updates every 3 seconds.
- **"Start Planning" button**: Only enabled when all files are processed and at least one file exists. Transitions the section to the Planning phase.

#### Planning

The AI generates a study plan — a series of topics in recommended study order, each with subtopics describing what the student will learn.

- **Loading state**: Spinner with a message while the plan generates.
- **Plan editor** (shown after generation):
  - Vertical list of topic cards.
  - **Each topic card** has:
    - Drag handle (left) for reordering topics.
    - Topic title — click to edit inline.
    - "Already Known" checkbox (top-right) — dims the card visually. These topics start as completed in the Studying phase.
    - Delete button (appears on hover).
    - List of subtopics — each is inline-editable, deletable (hover), and reorderable via drag-and-drop within the topic.
    - "+" button below the last subtopic (appears on hover) to add a new subtopic.
  - **"+" button** below all topics to add a new topic.
  - **Undo button** (top-right): Reverts the last edit. Works for all actions: deletes, edits, reorders, creation, mark as known.
  - **"Regenerate Plan" button**: Reveals an inline text box for required guidance (e.g., "Focus more on calculus, less on statistics"). The AI regenerates the plan based on the guidance, modifying the existing plan rather than starting from scratch. Old plan is kept in the undo stack.
  - **"Start Studying" button**: Finalizes the plan. Creates topics, generates text embeddings for RAG, creates all chat rooms. The plan can no longer be changed after this.

#### Studying

This is the main phase and where the student spends most of their time.

- **Progress widget**: Shows overall completion percentage, progress bar, and "X / Y topics completed".
- **Topic timeline**: A vertical list of topic cards connected by a timeline line (desktop). Each topic has a numbered node:
  - **Completed**: Blue filled node with checkmark, card is dimmed.
  - **Next to study**: Blue-glowing node, card has accent border and shadow.
  - **Other**: Neutral node.
- **Each topic card** shows:
  - Topic title and subtopics.
  - Interaction count (number of user messages in this topic's chat).
  - Completion checkbox (top-right) — toggleable at any time.
- Clicking a topic card opens the AI chat for that topic.
- **Revision chat**: A special card at the bottom (with sparkles icon) for general questions across all topics.

### Chat

When the user clicks a topic from the Studying page, they enter an AI chat specific to that topic.

- **Initial message**: On first load, the AI introduces the topic and asks the user to confirm before starting.
- **Message display**:
  - User messages: Right-aligned in a bubble.
  - AI messages: Left-aligned, no bubble, rendered with Markdown, LaTeX (inline `$...$` and block `$$...$$`), and syntax-highlighted code blocks.
  - While the AI searches study materials (RAG), a "Searching study materials" indicator with animated dots appears.
- **Undo**: On hover over a user message, an undo button (↩) appears. Clicking it reverts the conversation to before that message and places the text back in the input box. Undo is not available for messages that have been rolled into a conversation summary.
- **Input area**: Auto-growing textarea. Enter sends, Shift+Enter for newlines. Send button next to the input. Disabled while AI is responding.
- **Pedagogical flow**: The AI follows a structured teaching approach:
  1. Introduces the concept simply, then goes deeper.
  2. Asks if the student understood before proceeding.
  3. Solves a worked example applying the concept.
  4. Asks the student to solve a problem (offers help if needed).
  5. After all subtopics: announces the topic is finished, suggests marking it complete and moving on.
- **RAG**: The AI can search the student's uploaded materials to find relevant content, exam questions, etc.
- **Rate limit**: Max 10 messages per minute. If exceeded, a message asks the student to wait.
- **Revision chat**: Same interface, but for general questions across all topics in the section.
- **Usage limits**: Chat has a daily usage limit. As the student approaches the limit they see warning toasts (at 75% and 90%). When they cross the "best model" threshold a lighter model takes over mid-conversation and a toast explains the switch (with an upgrade link for free users). Free users who hit the hard cutoff see their message bounced back to the input box and a toast inviting them to come back tomorrow or subscribe. Pro users never hit a hard cutoff — the lighter model keeps working indefinitely.
- **Error recovery**: If a message fails to send for any reason (usage limit, network error, API error), the text is bounced back to the input box so the student can try again.

### Subscription

- **Tiers**: a **Free** tier with daily usage limits and a **Pro** tier (R$20 for 30 days) with much higher limits and no hard cutoff.
- **Credit balance**: every user has a balance in R$ that can be used to pay for Pro or that can be earned through bonuses. Credits do not expire.
- **Subscription page** (`/subscription`): reachable from the profile dropdown (always) and from a "Subscribe to Pro" chip in the navbar (free users only).
  - **Free users** see a Free vs Pro comparison, a "Subscribe to Pro" button, their balance, and the bonuses list.
  - **Pro users** see a "You are Pro until [date]" status card, their balance, and the bonuses list.
- **Payment flow**: clicking "Subscribe to Pro" opens a modal with a balance toggle ("Use my balance"). If credits cover the full price, the subscription activates immediately. Otherwise the modal switches to a PIX QR code screen with a 10-minute expiration timer. The page polls for payment confirmation and transitions to a "You're now Pro!" success state. The modal can be closed at any time — the subscription still activates if the payment goes through.
- **Bonuses**: shown as cards on the subscription page. Clicking a card opens a detail modal explaining how to qualify and a "Claim" button. Claimed bonuses are marked. The first bonus gives R$20 in credits (one month of Pro) to students with a Unicamp or USP email.

### Navigation

- **Navbar**: Fixed at the top. Logo "Eduh" on the left (gradient text). For free users, a "Subscribe to Pro" chip sits to the left of the profile button. Avatar button on the right that opens a dropdown with a "Subscription" link, language switcher, and logout.
- **Breadcrumb**: Below the navbar. Shows: Dashboard > Section Name > Topic Name. Section and topic names have dropdowns for quick navigation to other sections/topics.
