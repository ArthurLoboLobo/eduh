import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership, getSection, updateSectionStatus } from '@/lib/db/queries/sections';
import { listFiles, getExtractedTexts } from '@/lib/db/queries/files';
import { generatePlan, validatePlanJSON } from '@/lib/ai';
import { createPlanDraft } from '@/lib/db/queries/plans';

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
    if (!section || section.status !== 'uploading') {
      return NextResponse.json({ error: 'INVALID_SECTION_STATUS' }, { status: 400 });
    }

    const files = await listFiles(id);
    if (files.length === 0 || !files.every((f) => f.status === 'processed')) {
      return NextResponse.json({ error: 'FILES_NOT_READY' }, { status: 400 });
    }

    await updateSectionStatus(id, 'loading-planning');

    try {
      const texts = await getExtractedTexts(id);
      const allText = texts.join('\n\n');

      const plan = await generatePlan(allText);

      if (!validatePlanJSON(plan)) {
        await updateSectionStatus(id, 'uploading');
        return NextResponse.json({ error: 'PLAN_GENERATION_FAILED' }, { status: 500 });
      }

      await createPlanDraft(id, plan);
      await updateSectionStatus(id, 'planning');
      return NextResponse.json({ success: true });
    } catch (planError) {
      console.error(`Plan generation failed for section ${id}:`, planError);
      await updateSectionStatus(id, 'uploading');
      return NextResponse.json({ error: 'PLAN_GENERATION_FAILED' }, { status: 500 });
    }
  } catch (err) {
    console.error('POST /api/sections/:id/start-planning error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
