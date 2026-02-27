/**
 * BaselineReqs Integration Helper
 *
 * Centralises all outbound calls from BaselineDocs → BaselineReqs so that
 * both the standard delete flow and the admin delete flow share identical
 * logic.  All functions fail open — if BaselineReqs is unreachable or
 * BASELINEREQS_URL is not configured, operations proceed normally.
 */

import { logger } from '@/lib/logger'

export interface BaselineReqsReference {
  attachment_id: string
  attachment_title: string
  item_title: string
  item_type: string
  item_req_number: string
  project_name: string
  project_pid: string
}

export interface BaselineReqsLinksResult {
  linked: boolean
  count: number
  references: BaselineReqsReference[]
}

/**
 * Build the canonical public URL for a document.
 * Uses subdomain-based routing for proper tenant isolation.
 * e.g.  acme.baselinedocs.com/documents/<uuid>
 */
export function buildDocumentUrl(subdomain: string, documentId: string): string {
  return `https://${subdomain}.baselinedocs.com/documents/${documentId}`
}

/**
 * Check whether any BaselineReqs items reference this document URL.
 * Returns null if the integration is not configured or the request fails
 * (fail-open — callers should treat null as "no references known").
 */
export async function checkBaselineReqsReferences(
  subdomain: string,
  documentId: string
): Promise<BaselineReqsLinksResult | null> {
  const baseUrl = process.env.BASELINEREQS_URL
  const secret = process.env.INTEGRATION_SECRET

  if (!baseUrl || !secret) {
    // Integration not configured — skip silently
    return null
  }

  const docUrl = buildDocumentUrl(subdomain, documentId)

  try {
    const res = await fetch(
      `${baseUrl}/api/integrations/docs-links?doc_url=${encodeURIComponent(docUrl)}&subdomain=${encodeURIComponent(subdomain)}`,
      {
        headers: { 'x-integration-key': secret },
        // Always fetch fresh — we need current state before a destructive action
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      logger.warn(
        { subdomain, documentId, status: res.status },
        'BaselineReqs reference check returned non-OK status'
      )
      return null
    }

    return (await res.json()) as BaselineReqsLinksResult
  } catch (err) {
    logger.warn(
      { subdomain, documentId, error: err instanceof Error ? err.message : String(err) },
      'BaselineReqs reference check failed — proceeding with delete'
    )
    return null
  }
}

/**
 * Notify BaselineReqs that a document URL is now broken (document deleted).
 * Fire-and-forget — failures are logged but do not block the caller.
 */
export async function markBaselineReqsLinksBroken(
  subdomain: string,
  documentId: string
): Promise<void> {
  const baseUrl = process.env.BASELINEREQS_URL
  const secret = process.env.INTEGRATION_SECRET

  if (!baseUrl || !secret) return

  const docUrl = buildDocumentUrl(subdomain, documentId)

  try {
    const res = await fetch(`${baseUrl}/api/integrations/docs-links/mark-broken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-key': secret,
      },
      body: JSON.stringify({ doc_url: docUrl, subdomain }),
    })

    if (!res.ok) {
      logger.warn(
        { subdomain, documentId, docUrl, status: res.status },
        'BaselineReqs mark-broken returned non-OK status'
      )
    } else {
      logger.info(
        { subdomain, documentId, docUrl },
        'BaselineReqs links marked as broken'
      )
    }
  } catch (err) {
    logger.warn(
      { subdomain, documentId, error: err instanceof Error ? err.message : String(err) },
      'BaselineReqs mark-broken call failed'
    )
  }
}
