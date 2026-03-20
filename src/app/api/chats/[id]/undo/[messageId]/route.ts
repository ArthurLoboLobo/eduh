import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifyChatOwnership } from '@/lib/db/queries/chats';
import { getMessage, deleteMessagesFrom } from '@/lib/db/queries/messages';
import { getSummary } from '@/lib/db/queries/summaries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id: chatId, messageId: messageIdStr } = await params;
    const messageId = parseInt(messageIdStr, 10);
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'INVALID_MESSAGE_ID' }, { status: 400 });
    }

    const owns = await verifyChatOwnership(chatId, userId);
    if (!owns) {
      return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 });
    }

    // Check if message is before summary boundary
    const summary = await getSummary(chatId);
    if (summary && messageId <= summary.summarized_up_to_message_id) {
      return NextResponse.json({ error: 'CANNOT_UNDO_SUMMARIZED' }, { status: 400 });
    }

    const message = await getMessage(messageId);
    if (!message || message.chat_id !== chatId || message.role !== 'user') {
      return NextResponse.json({ error: 'INVALID_MESSAGE' }, { status: 400 });
    }

    await deleteMessagesFrom(chatId, messageId);

    return NextResponse.json({ content: message.content });
  } catch (err) {
    console.error('POST /api/chats/:id/undo/:messageId error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
