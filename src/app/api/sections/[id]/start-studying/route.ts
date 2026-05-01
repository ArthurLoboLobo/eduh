import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership, getSection, updateSectionStatus } from '@/lib/db/queries/sections';
import { getCurrentPlanDraft, deleteAllPlanDrafts } from '@/lib/db/queries/plans';
import { createTopicsFromPlan, listTopics } from '@/lib/db/queries/topics';
import { createChatsForSection } from '@/lib/db/queries/chats';
import { validatePlanJSON, chunkText, embedTexts } from '@/lib/ai';
import type { PlanJSON } from '@/lib/ai';
import { listFiles } from '@/lib/db/queries/files';
import { createEmbeddings } from '@/lib/db/queries/embeddings';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    const owns = await verifySectionOwnership(id, userId);
    if (!owns) {
      return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
    }

    const section = await getSection(id);
    if (!section || section.status !== 'planning') {
      return NextResponse.json({ error: 'INVALID_SECTION_STATUS' }, { status: 400 });
    }

    const draft = await getCurrentPlanDraft(id);
    if (!draft) {
      return NextResponse.json({ error: 'NO_PLAN_DRAFT' }, { status: 400 });
    }

    const plan = draft.plan_json as PlanJSON;
    if (!validatePlanJSON(plan)) {
      return NextResponse.json({ error: 'EMPTY_PLAN' }, { status: 400 });
    }

    await updateSectionStatus(id, 'loading-studying');

    try {
      await createTopicsFromPlan(id, plan);

      // Chunk and embed files for RAG
      const files = await listFiles(id);
      for (const file of files) {
        if (!file.extracted_text) continue;
        const chunks = chunkText(file.extracted_text);
        if (chunks.length === 0) continue;
        const embeddings = await embedTexts(chunks, 'RETRIEVAL_DOCUMENT');
        await createEmbeddings(id, file.id, chunks, embeddings);
      }

      const topics = await listTopics(id);
      const topicIds = topics.map((t) => t.id);
      await createChatsForSection(id, topicIds);

      await updateSectionStatus(id, 'studying');
      await deleteAllPlanDrafts(id);

      return NextResponse.json({ success: true });
    } catch (studyingError) {
      console.error(`start-studying failed for section ${id}:`, studyingError);
      await updateSectionStatus(id, 'planning');
      return NextResponse.json({ error: 'START_STUDYING_FAILED' }, { status: 500 });
    }
  } catch (err) {
    console.error('POST /api/sections/:id/start-studying error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
