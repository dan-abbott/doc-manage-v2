'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, User, FileText, CheckCircle, XCircle, Edit, Trash, Upload, Download, UserPlus, UserMinus, Send, ChevronDown, ChevronUp } from 'lucide-react'
import type { AuditLogEntry } from '@/app/actions/audit'

interface AuditTrailProps {
  auditLogs: AuditLogEntry[]
}

// Map actions to display names and icons
const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  'created': { label: 'Created', icon: FileText, color: 'text-blue-600' },
  'updated': { label: 'Updated', icon: Edit, color: 'text-gray-600' },
  'file_uploaded': { label: 'File Uploaded', icon: Upload, color: 'text-green-600' },
  'file_deleted': { label: 'File Deleted', icon: Download, color: 'text-red-600' },
  'submitted_for_approval': { label: 'Submitted', icon: Send, color: 'text-yellow-600' },
  'approved': { label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
  'rejected': { label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  'released': { label: 'Released', icon: CheckCircle, color: 'text-green-600' },
  'promoted_to_production': { label: 'Promoted', icon: FileText, color: 'text-purple-600' },
  'version_created': { label: 'New Version', icon: FileText, color: 'text-blue-600' },
  'document_obsoleted': { label: 'Obsoleted', icon: FileText, color: 'text-gray-600' },
  'approver_added': { label: 'Approver Added', icon: UserPlus, color: 'text-blue-600' },
  'approver_removed': { label: 'Approver Removed', icon: UserMinus, color: 'text-orange-600' },
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AuditLogEntry({ entry, isLast }: { entry: AuditLogEntry; isLast: boolean }) {
  const config = actionConfig[entry.action] || {
    label: entry.action,
    icon: Clock,
    color: 'text-gray-600',
  }
  
  const Icon = config.icon

  return (
    <div className="flex gap-3 pb-3 last:pb-0">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={`rounded-full p-1.5 bg-gray-100 ${config.color}`}>
          <Icon className="h-3 w-3" />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{config.label}</span>
              <span className="text-xs text-gray-500">by {entry.performed_by_email.split('@')[0]}</span>
            </div>
          </div>
          <time className="text-xs text-gray-400 whitespace-nowrap">
            {formatDate(entry.created_at)}
          </time>
        </div>

        {/* Additional details - only show important ones */}
        {entry.details && (
          <div className="mt-0.5 text-xs text-gray-600">
            {entry.details.comments && (
              <p className="italic text-gray-500 line-clamp-2">&quot;{entry.details.comments}&quot;</p>
            )}
            {entry.details.rejection_reason && (
              <div className="mt-1 p-1.5 bg-red-50 border border-red-200 rounded text-xs">
                <p className="text-red-700 line-clamp-2">{entry.details.rejection_reason}</p>
              </div>
            )}
            {entry.details.file_name && (
              <p className="text-gray-500 truncate">{entry.details.file_name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuditTrailClient({ auditLogs }: AuditTrailProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Show only most recent 3 when collapsed
  const displayLogs = isExpanded ? auditLogs : auditLogs.slice(0, 3)
  const hasMore = auditLogs.length > 3

  if (auditLogs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500">No activity recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Audit Trail
            <Badge variant="secondary" className="text-xs font-normal">
              {auditLogs.length} {auditLogs.length === 1 ? 'action' : 'actions'}
            </Badge>
          </CardTitle>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show All ({auditLogs.length})
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {displayLogs.map((entry, index) => (
            <AuditLogEntry 
              key={entry.id} 
              entry={entry} 
              isLast={index === displayLogs.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
