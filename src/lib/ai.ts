import { generateText, generateObject, embed, embedMany, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod/v4';
import { TEXT_EXTRACTION_MODEL, PLAN_GENERATION_MODEL, SUMMARIZATION_MODEL, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP, TOP_N_CHUNKS } from '@/config/ai';
import { searchChunks } from '@/lib/db/queries/embeddings';
import { TEXT_EXTRACTION_PROMPT, PLAN_GENERATION_PROMPT, planRegenerationPrompt, CHAT_SUMMARIZATION_PROMPT } from '@/prompts';
import { insertAiCallLog } from '@/lib/db/queries/aiLogs';

export type PlanJSON = {
  topics: {
    title: string;
    subtopics: string[];
    isKnown?: boolean;
  }[];
};

export function validatePlanJSON(data: unknown): data is PlanJSON {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.topics) || obj.topics.length === 0) return false;
  return obj.topics.every((topic: unknown) => {
    if (!topic || typeof topic !== 'object') return false;
    const t = topic as Record<string, unknown>;
    if (typeof t.title !== 'string' || t.title.trim() === '') return false;
    if (!Array.isArray(t.subtopics) || t.subtopics.length === 0) return false;
    return t.subtopics.every(
      (s: unknown) => typeof s === 'string' && s.trim() !== '',
    );
  });
}

const planSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string(),
      subtopics: z.array(z.string()),
    }),
  ),
});

export async function generatePlan(allText: string): Promise<PlanJSON> {
  const start = Date.now();
  const { object, usage } = await generateObject({
    model: google(PLAN_GENERATION_MODEL),
    schema: planSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PLAN_GENERATION_PROMPT },
          { type: 'text', text: allText },
        ],
      },
    ],
  });
  insertAiCallLog({
    label: 'plan-generation',
    model: PLAN_GENERATION_MODEL,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    inputText: PLAN_GENERATION_PROMPT + '\n' + allText,
    outputText: JSON.stringify(object),
    durationMs: Date.now() - start,
  });
  return object as PlanJSON;
}

export async function regeneratePlan(
  allText: string,
  guidance: string,
): Promise<PlanJSON> {
  const start = Date.now();
  const { object, usage } = await generateObject({
    model: google(PLAN_GENERATION_MODEL),
    schema: planSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: planRegenerationPrompt(guidance) },
          { type: 'text', text: allText },
        ],
      },
    ],
  });
  insertAiCallLog({
    label: 'plan-regeneration',
    model: PLAN_GENERATION_MODEL,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    inputText: planRegenerationPrompt(guidance) + '\n' + allText,
    outputText: JSON.stringify(object),
    durationMs: Date.now() - start,
  });
  return object as PlanJSON;
}

export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const start = Date.now();
  const { text, usage } = await generateText({
    model: google(TEXT_EXTRACTION_MODEL),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            data: fileBuffer,
            mediaType: mimeType,
          },
          {
            type: 'text',
            text: TEXT_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });
  insertAiCallLog({
    label: 'text-extraction',
    model: TEXT_EXTRACTION_MODEL,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    inputText: TEXT_EXTRACTION_PROMPT + `\n[binary file: ${mimeType}]`,
    outputText: text,
    durationMs: Date.now() - start,
  });
  return text;
}

export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP,
): string[] {
  if (!text || !text.trim()) return [];

  const charChunkSize = chunkSize * 4;
  const charOverlap = overlap * 4;
  const step = charChunkSize - charOverlap;
  const chunks: string[] = [];

  for (let start = 0; start < text.length; start += step) {
    let end = Math.min(start + charChunkSize, text.length);

    if (end < text.length) {
      const window = text.slice(start, end);
      const lastDoubleNewline = window.lastIndexOf('\n\n');
      if (lastDoubleNewline > charChunkSize * 0.5) {
        end = start + lastDoubleNewline + 2;
      } else {
        const lastNewline = window.lastIndexOf('\n');
        if (lastNewline > charChunkSize * 0.5) {
          end = start + lastNewline + 1;
        } else {
          const lastSpace = window.lastIndexOf(' ');
          if (lastSpace > charChunkSize * 0.5) {
            end = start + lastSpace + 1;
          }
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= text.length) break;
  }

  return chunks;
}

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const start = Date.now();
  const { embedding, usage } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text,
    providerOptions: { google: { outputDimensionality: 1536, taskType } },
  });
  insertAiCallLog({
    label: 'embed-single',
    model: EMBEDDING_MODEL,
    inputTokens: usage?.tokens ?? null,
    outputTokens: null,
    inputText: text,
    outputText: null,
    durationMs: Date.now() - start,
  });
  return embedding;
}

export async function embedTexts(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const start = Date.now();
  const { embeddings, usage } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values: texts,
    providerOptions: { google: { outputDimensionality: 1536, taskType } },
  });
  insertAiCallLog({
    label: 'embed-batch',
    model: EMBEDDING_MODEL,
    inputTokens: usage?.tokens ?? null,
    outputTokens: null,
    inputText: texts.join('\n---\n'),
    outputText: null,
    durationMs: Date.now() - start,
  });
  return embeddings;
}

export async function summarizeChat(
  previousSummary: string | null,
  messages: { role: string; content: string }[],
): Promise<string> {
  const messageText = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
  const userContent = previousSummary
    ? `<previous_summary>\n${previousSummary}\n</previous_summary>\n\n<new_messages>\n${messageText}\n</new_messages>`
    : `<messages>\n${messageText}\n</messages>`;

  const start = Date.now();
  const { text, usage } = await generateText({
    model: google(SUMMARIZATION_MODEL),
    system: CHAT_SUMMARIZATION_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  insertAiCallLog({
    label: 'chat-summarization',
    model: SUMMARIZATION_MODEL,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    inputText: CHAT_SUMMARIZATION_PROMPT + '\n' + userContent,
    outputText: text,
    durationMs: Date.now() - start,
  });
  return text;
}

export function createSearchStudentMaterialsTool(sectionId: string) {
  return tool({
    description: 'Search the student\'s uploaded study materials (slides, notes, past exams). Use to find practice problems and exam questions, or to reference exact definitions, formulas, and examples from their materials.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const embedding = await embedText(query, 'RETRIEVAL_QUERY');
      const results = await searchChunks(sectionId, embedding, TOP_N_CHUNKS);
      return results.map((r) => r.chunk_text).join('\n\n---\n\n');
    },
  });
}
