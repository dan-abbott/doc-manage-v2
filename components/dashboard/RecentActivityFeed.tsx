import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, FileText, CheckCircle, XCircle, ArrowUp, GitBranch, Clock } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Map actions to icons and labels
const actionConfig: Record<string, { icon: any, label: string, color: string }> = {
  'created': { icon: FileText, label: 'Created', color: 'text-blue-600' },
  'released': { icon: CheckCircle, label: 'Released', color: 'text-green-600' },
  'approved': { icon: CheckCircle, label: 'Approved', color: 'text-green-600' },
  'rejected': { icon: XCircle, label: 'Rejected', color: 'text-red-600' },
  'promoted_to_production': { icon: ArrowUp, label: 'Promoted', color: 'text-purple-600' },
  'version_created': { icon: GitBranch, label: 'New Version', color: 'text-blue-600' },
  'submitted_for_approval': { icon: Clock, label: 'Submitted', color: 'text-yellow-600' },
  'document_obsoleted': { icon: Activity, label: 'Obsoleted', color: 'text-gray-600' },
  'updated': { icon: FileText, label: 'Updated', color: 'text-blue-600' },
}

function formatTimeAgo(dateString: string) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (error) {
    return 'recently'
  }
}

function ActivityIcon({ action }: { action: string }) {
  const config = actionConfig[action] || { icon: Activity, label: action, color: 'text-gray-600' }
  const Icon = config.icon
  return <Icon className={`h-4 w-4 ${config.color}`} />
}

function ActivityLabel({ action }: { action: string }) {
  const config = actionConfig[action] || { label: action }
  return config.label
}

export default async function RecentActivityFeed() {
  try {
    const supabase = await createClient()

    // Get recent audit logs (no join - avoid RLS issues)
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_log')
      .select('id, document_id, action, performed_by_email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (auditError) {
      console.error('Audit log error:', auditError)
      throw auditError
    }

    if (!auditLogs || auditLogs.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-sm text-gray-500">
              No recent activity. Create or release a document to get started!
            </p>
          </CardContent>
        </Card>
      )
    }

    // Get unique document IDs
    const documentIds = [...new Set(auditLogs.map(log => log.document_id))]

    // Fetch documents separately (RLS will filter what user can see)
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, document_number, version, title')
      .in('id', documentIds)

    if (docError) {
      console.error('Documents error:', docError)
      // Don't throw - just show what we can
    }

    // Create lookup map
    const docMap = new Map()
    documents?.forEach(doc => {
      docMap.set(doc.id, doc)
    })

    // Combine the data
    const activities = auditLogs
      .map(log => {
        const doc = docMap.get(log.document_id)
        if (!doc) return null // Skip if user can't see this document
        
        return {
          ...log,
          document: doc
        }
      })
      .filter(Boolean) // Remove nulls

    if (activities.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-sm text-gray-500">
              No recent activity visible.
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table-like layout for horizontal, compact display */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity: any) => {
                  const doc = activity.document

                  return (
                    <tr key={activity.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-3">
                        <Link 
                          href={`/documents/${activity.document_id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {doc.document_number}{doc.version}
                        </Link>
                      </td>
                      <td className="py-3">
                        <Link 
                          href={`/documents/${activity.document_id}`}
                          className="text-sm text-gray-900 hover:underline truncate max-w-xs block"
                        >
                          {doc.title || 'Untitled Document'}
                        </Link>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <ActivityIcon action={activity.action} />
                          <span className="text-sm text-gray-600">
                            {ActivityLabel({ action: activity.action })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-600">
                          {activity.performed_by_email?.split('@')[0] || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('RecentActivityFeed error:', error)
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-sm text-red-500">
            Unable to load recent activity
          </p>
        </CardContent>
      </Card>
    )
  }
}
