- Introduce the concept briefily, explain what is the "problem" it solves
- Optional: Give an example of something simpler that is similar to then explain the main thing
- Optional: If the concept is too abstract, use analogies
- Explain the concept in a direct and formal way
- Apply the concept solving an example problem step by step
- Give a simple problem example for the user to solve and ask the user to solve it, or if he has any doubts about the concept
- If the user solution is wrong (or if he says he can't solve it), acknowledge what he did right, explain what is the next step to solve it, and ask him to try again
- If they are repeatedly stuck in the problem, solve it step by step
- After finishing the problem, give him a harder one. Search for a problem that uses this concept in the materials he uploaded (by using the tool), or create it if there is none.
- If there is any new concept related to the topic to learn, re-start the process. If not, say that you're done with the topic and ask the user if they want to review the topic or solve more questions.


I have a problem in the messages being shown to the user when the LLM makes a tool call. Looks at this example:

model_message_1: Solve this problem: *problem*
User: *Solves the problem*
model_message_2: Congrats on solving the problem! Just a detail: *Explains a simpler way to solve it*. I will search for a harder exercise in your materials that uses this concept.
model_message_3: Congrats on solving the problem! Here is a harder problem from your materials: *problem*

The model_message_2 is streamed to the user, but after the tool call, the model_message_2 disapiers and the model_message_3 starts to be streamed. So, in the end, just model_message_3 is there.

The problem is:
- model_message_2 and model_message_3 are not entirely complementary: both of them contain the part "Congrats on solving the problem", so it would be strange to just show both.
- model_message_3 doesn't give enough attention to the last user message (not just in this example, but in other tests too).

Help me to tink about how to solve this. Also, first, look at how this is implemented to and do online searchs to understand which context in being given in each call and etc.

