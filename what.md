# What is Ditchy?
Ditchy is a platform that helps university students prepare for exams using AI. The main goal is to prepare for a specific exam, not for a subject as a whole.

## User flow

### Register / Login
- The root page (`/`) serves as both the landing page and the login/register page.
- The page includes general information about the platform (what it is, how it works) with the login/register form in the center.
- Login and registration share a unified flow and form.
- The user enters their email address to receive a one-time confirmation code.
- After filling the email and confirming it, the form changes to show a confirmation code input.
- After entering the correct code, the user is authenticated and redirected to the dashboard.
- If the user is already logged in, they are redirected straight to the dashboard.
- The user stays logged for 30 days across sessions.

### Dashboard
- The dashboard has a list of all the sections the user created in a grid (or a notice "No sections created yet, click _Create new Section_ to create one")
- Above the section list, there is a search bar to filter sections by name, and a button to create a new section.
- Each section is a card with:
    - The section name and description
    - The creation date
    - A status badge showing the current status (Uploading, Planning, or Studying)
    - A progress indicator (e.g., "3/8 topics completed") — only shown when the section is in the Studying status
    - A delete button to permanently delete the section (with a confirmation dialog)
- The user can click on a section to go to the section page

### Section page
- A section has 3 statuses: Uploading, Planning, and Studying
- Each status has a different interface
- When first entering the section page, the user is in the Uploading interface

#### Uploading
- The user can upload files from their computer
- The files could be past exams, slides, notes, etc. Anything relevant to help the AI decide what to teach the user for the exam
- The files will be used to create the study plan
- A status will be shown next to each file: "Uploading" -> "Processing" -> "Processed"
- The user can click on a file to preview it, and click a remove button to delete it from the section.
- When all sent files are processed, the user can click on a button to start the planning process and no new files can be uploaded.

#### Planning
- The planning page will show a loading screen while the LLM is creating the study plan
- A notice will appear saying that the study plan is being created
- An LLM will analyze the files and create a study plan: a series of topics (each one with subtopics) that the user should study to prepare for the exam
- The order matters: The order shown is the recommended order to study.
- Each topic has a title and a list of subtopics describing what the user will study in this topic.
- The study plan will be shown to the user
- The user can edit the study plan in the following ways:
    - Delete a topic: By clicking a trash button that appears when hovering over a topic card. When deleting a topic, all its subtopics will be deleted as well and the card will disappear from the interface.
    - Delete a subtopic: By clicking a trash button that appears when hovering over a subtopic (each subtopic is a child of a topic and is inside the topic card).
    - Edit a topic title: When hovering over the title, the user can click to edit the text in it.
    - Edit a subtopic: When hovering over the text, the user can click to edit the text in it.
    - Create a new topic: Below all the topics, there is a "+" button to create a new topic. By clicking it, a new empty topic will be created at the end. The user will edit the topic title and create subtopics.
    - Create a new subtopic: By clicking a "+" button that appears below the last subtopic when hovering over a topic card. By clicking it, a new empty subtopic will be created at the end of the topic. The user will edit the subtopic text.
    - Reorder topics: Users can drag and drop the topics to reorder them. On the left side of the card, there will be a small icon to drag and drop the whole card.
    - Reorder subtopics: Users can drag and drop subtopics within a topic to reorder them.
    - Mark as known: In the top right, there will be a small "Already Known" checkbox to click and mark the topic as known. The topics marked as "known" won't be excluded from the studying page (the next one); they will just start marked as completed, and the user can unmark them in the future if needed.
    - Undo: The user can undo any editing action (deletes, edits, reorders, etc.) using an undo button at the top of the planning interface.
- The user can click a "Regenerate Plan" button to have the AI create a new study plan from scratch. An inline text box appears for required guidance (e.g., "Focus more on calculus, less on statistics") — the confirm button is disabled until the user types something.
- After finishing the edits, the user clicks "Start Studying" and the study plan can no longer be changed.

#### Studying
- This is the main page of a section and the one that will be active for most of the time.
- At the top, a progress indicator shows overall completion (e.g., "3/8 topics completed" with a progress bar).
- It has a list of cards, each representing a topic.
- Each topic has its own AI chat, where the student will enter the chat and talk with the LLM to learn the specific topic. Each chat is independent and has the only goal to make the user learn the topic.
- The user can mark a topic as completed by clicking the checkbox in the top right corner of the topic card when he finished studying it (actually, he can mark/unmark as completed anytime, and it will visually show as completed or not completed).
- When the user clicks on a topic card, the AI chat will open in another page (a chat-specific link). About the chat:
    - When the user first enters the chat (or the chat just don't have any message yet), the initial message will be a message from the LLM introducing what will be learnt in this topic and asking the user confirmation to start teaching it.
    - The chat is a standard AI chatbot interface, where the user can send messages and the LLM will respond.
    - The LLM will have access to all the files the student uploaded to the section, and will use them to help the student learn the topic (for example, by using exam's questions as practice questions).
    - When hovering over a message the user sent, an undo icon (↩) appears next to it. Clicking it returns the conversation to the point right before sending that message (the message content is placed back in the text box). Undo is only available for recent messages — older messages that have been rolled into a conversation summary can no longer be undone.
    - The chat will be latex and markdown-formatted, and the LLM will use both to make their answer more readable.
    - The pedagogical flow of a conversarion should be as follows:
        - First, the LLM will introduce what will be learnt in this topic and ask for confirmation to start teaching it.
        - For each subtopic, the LLM will first introduce it in a simple way, then go deeper into it. The LLM should contantly ask the user if he understood the concept before going deeper.
        - After explaining a subtopic, the LLM should solve a problem that applies it.
        - Then, the LLM should ask the user to solve another problem by himself. The user is welcome to ask the LLM for help if needed.
        - After the user is ok with a subtopic, the LLM should ask if he wants to move to the next subtopic.
        - After all subtopics are finished, the LLM will announce that the topic is finished and suggest the user to mark the topic as completed and move to the next topic, or keep practing more problems in the same chat.
- Apart from the topic-specific chat, at the end of the list there will be a revision chat, where the user can ask the LLM more general questions about all the topics in the section, ask for new problems to solve, etc.
