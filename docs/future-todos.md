# Future TODOs

- **Production deployment**:
  - Subscribe to Vercel (Pro plan) and set up a proper email/domain.
  - Set a spending cap on the Gemini API to avoid unexpected costs.
  - Add safety measures against spam (e.g., rate limiting OTP requests, captcha, abuse detection).
  - **Share study plans**: Implement the ability to share study plans with others. Consider how both logged-in and non-logged-in users will view a shared plan, and how the sharing mechanism works (e.g., shareable link, copy-to-clipboard, etc.).
- **Landing page improvements**: Add images/screenshots to the landing page and improve the copy to better explain how the app works and its value proposition.
- **Improve embedding chunking**: Ensure the text chunking algorithm never splits a word into two separate chunks — always break at word boundaries.
- **Smarter problem-aware retrieval**: Make the embedding and retrieval process more efficient by ensuring each problem is always placed in its own chunk(s). When a chunk belonging to a problem is retrieved via similarity search, return the entire problem (and its solution, if available) rather than just the matched chunk.

