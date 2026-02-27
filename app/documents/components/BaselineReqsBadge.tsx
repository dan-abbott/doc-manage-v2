'use client'

/**
 * BaselineReqsBadge
 *
 * Pure display component — receives pre-fetched BaselineReqs reference data
 * from the server page component (fetched with a 5-minute cache so it doesn't
 * add latency on every page load).
 *
 * Renders nothing if there are no references.
 */

import { useState } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import type { BaselineReqsLinksResult } from '@/lib/integrations/baselinereqs'

interface BaselineReqsBadgeProps {
  refs: BaselineReqsLinksResult | null
}

export default function BaselineReqsBadge({ refs }: BaselineReqsBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  if (!refs?.linked) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Link2 className="h-3 w-3" />
        {refs.count} Requirement{refs.count === 1 ? '' : 's'} in BaselineReqs
      </button>

      {expanded && refs.references.length > 0 && (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Linked Requirements
          </p>
          <ul className="space-y-1.5">
            {refs.references.map((ref) => (
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
