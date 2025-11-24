import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User, FileText, CheckCircle, XCircle, Edit, Trash, Upload, Download, UserPlus, UserMinus, Send } from 'lucide-react'
import { getDocumentAuditLog, type AuditLogEntry } from '@/app/actions/audit'

interface AuditTrailProps {
  documentId: string
}

// Map actions to display names and icons
const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  'created': { label: 'Document Created', icon: FileText, color: 'text-blue-600' },
  'updated': { label: 'Document Updated', icon: Edit, color: 'text-gray-600' },
  'file_uploaded': { label: 'File Uploaded', icon: Upload, color: 'text-green-600' },
  'file_deleted': { label: 'File Deleted', icon: Download, color: 'text-red-600' },
  'submitted_for_approval': { label: 'Submitted for Approval', icon: Send, color: 'text-yellow-600' },
  'approved': { label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
  'rejected': { label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  'released': { label: 'Released', icon: CheckCircle, color: 'text-green-600' },
  'promoted_to_production': { label: 'Promoted to Production', icon: FileText, color: 'text-purple-600' },
  'version_created': { label: 'New Version Created', icon: FileText, color: 'text-blue-600' },
  'document_obsoleted': { label: 'Document Obsoleted', icon: FileText, color: 'text-gray-600' },
  'approver_added': { label: 'Approver Added', icon: UserPlus, color: 'text-blue-600' },
  'approver_removed': { label: 'Approver Removed', icon: UserMinus, color: 'text-orange-600' },
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AuditLogEntry({ entry }: { entry: AuditLogEntry }) {
  const config = actionConfig[entry.action] || {
    label: entry.action,
    icon: Clock,
    color: 'text-gray-600',
  }
  
  const Icon = config.icon

  return (
    <div className="flex gap-4 pb-4 last:pb-0">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={`rounded-full p-2 bg-gray-100 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-0.5 h-full bg-gray-200 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pt-1 pb-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-gray-500">
              by {entry.performed_by_email}
            </p>
          </div>
          <time className="text-xs text-gray-500 whitespace-nowrap">
            {formatDate(entry.created_at)}
          </time>
        </div>

        {/* Additional details */}
        {entry.details && (
          <div className="mt-2 text-sm text-gray-600">
            {entry.details.document_number && (
              <p className="font-mono text-xs">{entry.details.document_number}</p>
            )}
            {entry.details.comments && (
              <p className="italic mt-1">&quot;{entry.details.comments}&quot;</p>
            )}
            {entry.details.rejection_reason && (
              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <p className="font-medium text-red-800">Rejection Reason:</p>
                <p className="text-red-700">{entry.details.rejection_reason}</p>
              </div>
            )}
            {entry.details.approver_email && (
              <p className="text-xs">Approver: {entry.details.approver_email}</p>
            )}
            {entry.details.approver_count !== undefined && (
              <p className="text-xs">{entry.details.approver_count} approver(s)</p>
            )}
            {entry.details.file_name && (
              <p className="text-xs font-mono">File: {entry.details.file_name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default async function AuditTrail({ documentId }: AuditTrailProps) {
  const result = await getDocumentAuditLog(documentId)

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Unable to load audit trail</p>
        </CardContent>
      </Card>
    )
  }

  const auditLogs = result.data as AuditLogEntry[]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet</p>
        ) : (
          <div className="space-y-0">
            {auditLogs.map((entry) => (
              <AuditLogEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
