import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { TEXT_EXTRACTION_MODEL } from '@/config/ai';
import { TEXT_EXTRACTION_PROMPT } from '@/prompts';

export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const { text } = await generateText({
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

  return text;
}
