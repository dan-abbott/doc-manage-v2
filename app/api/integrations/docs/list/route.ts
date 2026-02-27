/**
 * GET /api/integrations/docs/list
 *
 * Powers the BaselineReqs "Link existing doc" file picker.
 * Returns a searchable list of Released/non-Obsolete documents for a tenant,
 * identified by subdomain (not tenant UUID — see integration design notes).
 *
 * Query params:
 *   subdomain  — the tenant subdomain (e.g. "acme")
 *   q          — optional search string matched against title and document_number
 *
 * Auth: x-integration-key header must match INTEGRATION_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildDocumentUrl } from '@/lib/integrations/baselinereqs'
import { logger } from '@/lib/logger'

// Use service-role client — this route is server-to-server, not user-session-based
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const key = req.headers.get('x-integration-key')
  if (!key || key !== process.env.INTEGRATION_SECRET) {
    logger.warn({ path: req.nextUrl.pathname }, 'Integration auth failed on docs/list')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const subdomain = req.nextUrl.searchParams.get('subdomain')?.trim()
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Resolve tenant ────────────────────────────────────────────────────────
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  if (tenantError || !tenant) {
    logger.warn({ subdomain }, 'docs/list: tenant not found')
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // ── Query documents ───────────────────────────────────────────────────────
  // Surface Released documents only — Drafts and In-Approval docs aren't
  // stable enough to link to, and Obsolete docs shouldn't attract new links.
  let dbQuery = supabase
    .from('documents')
    .select('id, title, document_number, version, status, updated_at')
    .eq('tenant_id', tenant.id)
    .eq('status', 'Released')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (query) {
    // Partial, case-insensitive match on number or title — same as the app's search
    dbQuery = dbQuery.or(
      `document_number.ilike.%${query}%,title.ilike.%${query}%`
    )
  }

  const { data, error } = await dbQuery

  if (error) {
    logger.error({ subdomain, tenantId: tenant.id, error: error.message }, 'docs/list DB query failed')
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // ── Shape response ────────────────────────────────────────────────────────
  const docs = (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    document_number: d.document_number,
    version: d.version,
    status: d.status,
    updated_at: d.updated_at,
    // Canonical URL that BaselineReqs will store as the attachment href
    url: buildDocumentUrl(subdomain, d.id),
    // Human-readable label for the picker UI
    display_label: `${d.document_number}${d.version} — ${d.title}`,
  }))

  logger.info(
    { subdomain, query, count: docs.length },
    'docs/list returned results'
  )

  return NextResponse.json({ docs })
}
