import { NextRequest, NextResponse } from 'next/server';
import { streamText, generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifyChatOwnership, getChat } from '@/lib/db/queries/chats';
import { getMessages, getMessagesAfterSummary, createMessage, deleteMessagesFrom, getMessageCountLastMinute } from '@/lib/db/queries/messages';
import { getSummary, upsertSummary } from '@/lib/db/queries/summaries';
import { listTopics } from '@/lib/db/queries/topics';
import { createSearchStudentMaterialsTool, summarizeChat } from '@/lib/ai';
import { TEACHING_CHAT_MODEL, RATE_LIMIT_MESSAGES_PER_MINUTE, SUMMARIZATION_TOKEN_THRESHOLD, MIN_UNSUMMARIZED_MESSAGES } from '@/config/ai';
import { insertAiCallLog } from '@/lib/db/queries/aiLogs';
import {
  topicChatSystemPrompt,
  revisionChatSystemPrompt,
  TOPIC_CHAT_INITIAL_USER_MESSAGE_PT,
  TOPIC_CHAT_INITIAL_USER_MESSAGE_EN,
  REVISION_CHAT_INITIAL_USER_MESSAGE_PT,
  REVISION_CHAT_INITIAL_USER_MESSAGE_EN,
} from '@/prompts';
import { cookies } from 'next/headers';

function buildSystemPrompt(
  chat: { type: string; topic_title: string | null },
  allTopics: { title: string; subtopics: { text: string }[] }[],
  currentSubtopics?: string[],
): string {
  const topicData = allTopics.map((t) => ({
    title: t.title,
    subtopics: t.subtopics.map((s) => s.text),
  }));

  if (chat.type === 'topic' && chat.topic_title) {
    return topicChatSystemPrompt({
      currentTopicTitle: chat.topic_title,
      subtopics: currentSubtopics ?? [],
    });
  }

  return revisionChatSystemPrompt({
    allTopics: topicData,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const owns = await verifyChatOwnership(chatId, userId);
    if (!owns) {
      return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 });
    }

    const messages = await getMessages(chatId);

    if (messages.length === 0) {
      // First load — generate initial AI greeting
      const cookieStore = await cookies();
      const lang = cookieStore.get('eduh_language')?.value ?? 'pt-BR';

      const chat = await getChat(chatId);
      if (!chat) {
        return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 });
      }

      const allTopics = await listTopics(chat.section_id);
      const currentTopic = allTopics.find((t) => t.id === chat.topic_id);
      const currentSubtopics = currentTopic?.subtopics.map((s) => s.text) ?? [];

      const systemPrompt = buildSystemPrompt(chat, allTopics, currentSubtopics);

      let initialMessage: string;
      if (chat.type === 'topic') {
        initialMessage = lang === 'en' ? TOPIC_CHAT_INITIAL_USER_MESSAGE_EN : TOPIC_CHAT_INITIAL_USER_MESSAGE_PT;
      } else {
        initialMessage = lang === 'en' ? REVISION_CHAT_INITIAL_USER_MESSAGE_EN : REVISION_CHAT_INITIAL_USER_MESSAGE_PT;
      }

      const greetingStart = Date.now();
      const { text, usage: greetingUsage } = await generateText({
        model: google(TEACHING_CHAT_MODEL),
        system: systemPrompt,
        messages: [{ role: 'user', content: initialMessage }],
        tools: { searchStudentMaterials: createSearchStudentMaterialsTool(chat.section_id) },
        stopWhen: stepCountIs(3),
      });
      insertAiCallLog({
        label: 'chat-initial-greeting',
        model: TEACHING_CHAT_MODEL,
        inputTokens: greetingUsage?.inputTokens ?? null,
        outputTokens: greetingUsage?.outputTokens ?? null,
        inputText: systemPrompt + '\n' + initialMessage,
        outputText: text,
        userId,
        sectionId: chat.section_id,
        durationMs: Date.now() - greetingStart,
      });

      const saved = await createMessage(chatId, 'assistant', text);
      return NextResponse.json({ messages: [saved], summarizedUpToMessageId: 0 });
    }

    const summary = await getSummary(chatId);
    return NextResponse.json({
      messages,
      summarizedUpToMessageId: summary?.summarized_up_to_message_id ?? 0,
    });
  } catch (err) {
    console.error('GET /api/chats/:id/messages error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let savedUserMessage: { id: number } | null = null;
  const chatId = (await params).id;

  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const owns = await verifyChatOwnership(chatId, userId);
    if (!owns) {
      return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 });
    }

    // Rate limit
    const recentCount = await getMessageCountLastMinute(userId);
    if (recentCount >= RATE_LIMIT_MESSAGES_PER_MINUTE) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    // Extract user message from useChat request body (UIMessage format with parts)
    const body = await request.json();
    const userMessages = body.messages?.filter((m: { role: string }) => m.role === 'user') ?? [];
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
    }
    // UIMessage uses parts array; fall back to content for compatibility
    let content = '';
    if (lastUserMessage.parts) {
      content = lastUserMessage.parts
        .filter((p: { type: string }) => p.type === 'text')
        .map((p: { text: string }) => p.text)
        .join('');
    } else if (typeof lastUserMessage.content === 'string') {
      content = lastUserMessage.content;
    }
    if (!content.trim()) {
      return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
    }

    // Save user message
    savedUserMessage = await createMessage(chatId, 'user', content);

    // Build LLM context
    const chat = await getChat(chatId);
    if (!chat) {
      return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 });
    }

    const allTopics = await listTopics(chat.section_id);
    const currentTopic = allTopics.find((t) => t.id === chat.topic_id);
    const currentSubtopics = currentTopic?.subtopics.map((s) => s.text) ?? [];
    const systemPrompt = buildSystemPrompt(chat, allTopics, currentSubtopics);

    const summary = await getSummary(chatId);
    const unsummarizedMessages = await getMessagesAfterSummary(chatId);

    const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (summary) {
      llmMessages.push({ role: 'system', content: `Previous conversation summary:\n${summary.summary_text}` });
    }

    for (const msg of unsummarizedMessages) {
      llmMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    const streamStart = Date.now();
    const result = streamText({
      model: google(TEACHING_CHAT_MODEL),
      system: systemPrompt,
      messages: llmMessages,
      tools: { searchStudentMaterials: createSearchStudentMaterialsTool(chat.section_id) },
      stopWhen: stepCountIs(3),
      async onFinish({ text, usage: streamUsage }) {
        insertAiCallLog({
          label: 'chat-stream',
          model: TEACHING_CHAT_MODEL,
          inputTokens: streamUsage?.inputTokens ?? null,
          outputTokens: streamUsage?.outputTokens ?? null,
          inputText: systemPrompt + '\n' + JSON.stringify(llmMessages),
          outputText: text,
          userId,
          sectionId: chat.section_id,
          durationMs: Date.now() - streamStart,
        });
        // Save assistant message
        await createMessage(chatId, 'assistant', text);

        // Check summarization threshold
        try {
          const currentSummary = await getSummary(chatId);
          const currentUnsummarized = await getMessagesAfterSummary(chatId);

          if (currentUnsummarized.length <= MIN_UNSUMMARIZED_MESSAGES) return;

          const summaryText = currentSummary?.summary_text ?? '';
          const unsummarizedContent = currentUnsummarized.map((m) => m.content).join(' ');
          const estimatedTokens = Math.ceil((summaryText.length + unsummarizedContent.length) / 4);

          if (estimatedTokens > SUMMARIZATION_TOKEN_THRESHOLD) {
            const messagesToSummarize = currentUnsummarized.slice(0, -MIN_UNSUMMARIZED_MESSAGES);
            if (messagesToSummarize.length === 0) return;

            const newSummary = await summarizeChat(
              currentSummary?.summary_text ?? null,
              messagesToSummarize.map((m) => ({ role: m.role, content: m.content })),
            );

            const lastSummarizedMsg = messagesToSummarize[messagesToSummarize.length - 1];
            await upsertSummary(chatId, newSummary, lastSummarizedMsg.id);
          }
        } catch (err) {
          console.error('Summarization error:', err);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('POST /api/chats/:id/messages error:', err);
    // Clean up saved user message on error
    if (savedUserMessage) {
      try {
        await deleteMessagesFrom(chatId, savedUserMessage.id);
      } catch {
        // ignore cleanup error
      }
    }
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
