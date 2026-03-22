import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySectionOwnership, getSection } from '@/lib/db/queries/sections';
import { getCurrentPlanDraft, createPlanDraft } from '@/lib/db/queries/plans';
import { getExtractedTexts } from '@/lib/db/queries/files';
import { regeneratePlan, validatePlanJSON, type PlanJSON } from '@/lib/ai';

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

    const body = await request.json();
    const guidance = typeof body.guidance === 'string' ? body.guidance.trim() : '';
    if (!guidance) {
      return NextResponse.json({ error: 'GUIDANCE_REQUIRED' }, { status: 400 });
    }

    try {
      const texts = await getExtractedTexts(id);
      const allText = texts.join('\n\n');

      const plan = await regeneratePlan(allText, guidance, draft.plan_json as PlanJSON);

      if (!validatePlanJSON(plan)) {
        return NextResponse.json({ error: 'REGENERATION_FAILED' }, { status: 500 });
      }

      await createPlanDraft(id, plan);
      return NextResponse.json({ success: true });
    } catch (regenError) {
      console.error(`Plan regeneration failed for section ${id}:`, regenError);
      return NextResponse.json({ error: 'REGENERATION_FAILED' }, { status: 500 });
    }
  } catch (err) {
    console.error('POST /api/sections/:id/plan/regenerate error:', err);
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
  }
}
