# Future TODOs

- **Improve embedding chunking**: Ensure the text chunking algorithm never splits a word into two separate chunks — always break at word boundaries.
- **Smarter problem-aware retrieval**: Make the embedding and retrieval process more efficient by ensuring each problem is always placed in its own chunk(s). When a chunk belonging to a problem is retrieved via similarity search, return the entire problem (and its solution, if available) rather than just the matched chunk.
- **Redesign chat undo action**: Change the undo symbol/icon used to undo a message in chat, and reposition the button from the left side to the bottom right, placed just below the message bubble.
- **Fix textarea height on undo**: When undoing a multi-line message, the textarea initially renders as a single-line input and only expands to the correct height after the user makes any edit. The textarea should auto-resize to fit the restored content immediately on undo.
