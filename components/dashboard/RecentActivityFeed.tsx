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
  const supabase = await createClient()
  
  // Get recent activities (get more to ensure we have 10 unique docs)
  // Use explicit foreign key relationship to avoid ambiguity
  const { data: activities, error } = await supabase
    .from('audit_log')
    .select(`
      id,
      document_id,
      action,
      performed_by_email,
      created_at,
      documents!audit_log_document_id_fkey (
        document_number,
        title,
        version
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50) // Get 50 to ensure 10 unique documents

  if (error) {
    console.error('Error loading recent activity:', error)
    return (
      <div className="text-sm text-gray-500">
        Unable to load recent activity
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No recent activity to display
      </div>
    )
  }

  // Roll up activities by document - only show latest activity per document
  const uniqueActivities: any[] = []
  const seenDocuments = new Set<string>()

  for (const activity of activities) {
    if (!seenDocuments.has(activity.document_id)) {
      uniqueActivities.push(activity)
      seenDocuments.add(activity.document_id)
      
      if (uniqueActivities.length >= 10) break
    }
  }

  return (
    <div className="space-y-3">
      {uniqueActivities.map((activity) => {
        const document = activity.documents as any
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="mt-0.5">
              <ActivityIcon action={activity.action} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/documents?selected=${document?.document_number}`}
                    className="font-medium text-sm text-gray-900 hover:text-blue-600 hover:underline"
                  >
                    {document?.document_number || 'Unknown Document'}
                    {document?.version && ` ${document.version}`}
                  </Link>
                  <p className="text-sm text-gray-600 truncate mt-0.5">
                    {document?.title || 'No title'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <ActivityLabel action={activity.action} /> by {activity.performed_by_email}
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
