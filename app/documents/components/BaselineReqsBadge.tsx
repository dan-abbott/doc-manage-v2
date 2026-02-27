'use client'

/**
 * BaselineReqsBadge
 *
 * Shows how many BaselineReqs items reference this document.
 * Fetches client-side so it never blocks the server-rendered page.
 * Only renders when the integration is configured and returns data.
 */

import { useEffect, useState } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import type { BaselineReqsLinksResult } from '@/lib/integrations/baselinereqs'

interface BaselineReqsBadgeProps {
  documentId: string
  subdomain: string
}

export default function BaselineReqsBadge({ documentId, subdomain }: BaselineReqsBadgeProps) {
  const [data, setData] = useState<BaselineReqsLinksResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchRefs() {
      try {
        // We call our own server as a thin proxy rather than reaching BaselineReqs
        // directly from the browser — keeps the integration secret server-side.
        const res = await fetch(
          `/api/integrations/docs/refs?document_id=${encodeURIComponent(documentId)}`,
          { cache: 'no-store' }
        )
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // Fail silently — badge is optional
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRefs()
    return () => { cancelled = true }
  }, [documentId])

  // Don't render anything while loading or if there are no references
  if (loading || !data?.linked) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Link2 className="h-3 w-3" />
        {data.count} Requirement{data.count === 1 ? '' : 's'} in BaselineReqs
      </button>

      {expanded && data.references.length > 0 && (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Linked Requirements
          </p>
          <ul className="space-y-1.5">
            {data.references.map((ref) => (
              <li key={ref.attachment_id} className="flex items-start gap-2">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                <span className="text-blue-900">
                  <span className="font-medium">{ref.item_req_number}</span>
                  {' — '}
                  {ref.item_title}
                  <span className="text-blue-600 text-xs ml-1.5">
                    {ref.project_name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
