/**
 * GET /api/integrations/docs/refs
 *
 * Internal proxy used by BaselineReqsBadge (client component) to fetch
 * BaselineReqs reference data without exposing INTEGRATION_SECRET to the browser.
 *
 * Query params:
 *   document_id — the BaselineDocs document UUID
 *
 * Auth: standard Supabase session cookie (user must be authenticated).
 * Returns the BaselineReqs link response, or { linked: false } if the
 * integration is not configured or the document is not found.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSubdomain } from '@/lib/tenant'
import { checkBaselineReqsReferences } from '@/lib/integrations/baselinereqs'

export async function GET(req: NextRequest) {
  // ── Auth: require a valid user session ───────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const documentId = req.nextUrl.searchParams.get('document_id')?.trim()
  if (!documentId) {
    return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
  }

  // ── Verify the document belongs to the current tenant (tenant isolation) ─
  const subdomain = await getCurrentSubdomain()
  if (!subdomain) {
    return NextResponse.json({ linked: false, count: 0, references: [] })
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .single()

  if (!doc) {
    // Document not found or user doesn't have access — return empty rather than 404
    // to avoid leaking existence information
    return NextResponse.json({ linked: false, count: 0, references: [] })
  }

  // ── Proxy to BaselineReqs ─────────────────────────────────────────────────
  const refs = await checkBaselineReqsReferences(subdomain, documentId)

  if (!refs) {
    // Integration not configured or BaselineReqs unreachable
    return NextResponse.json({ linked: false, count: 0, references: [] })
  }

  return NextResponse.json(refs)
}
