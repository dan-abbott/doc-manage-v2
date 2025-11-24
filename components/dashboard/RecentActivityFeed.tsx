import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, FileText, CheckCircle, XCircle, ArrowUp, GitBranch, Clock } from 'lucide-react'
import Link from 'next/link'
import { getRecentActivity, ActivityItem } from '@/app/actions/dashboard'

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
}

function formatTimeAgo(dateString: string) {
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
}

function ActivityIcon({ action }: { action: string }) {
  const config = actionConfig[action] || { icon: Activity, label: action, color: 'text-gray-600' }
  const Icon = config.icon
  return <Icon className={`h-4 w-4 ${config.color}`} />
}

function ActivityLabel({ action }: { action: string }) {
  const config = actionConfig[action] || { label: action }
  return <span className="font-medium">{config.label}</span>
}

export default async function RecentActivityFeed() {
  const result = await getRecentActivity(10)

  if (!result.success || !result.data || result.data.length === 0) {
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

  const activities = result.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity: ActivityItem) => (
            <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
              <div className="flex-shrink-0 mt-0.5">
                <ActivityIcon action={activity.action} />
              </div>
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/documents/${activity.document_id}`}
                  className="hover:underline"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {activity.document_number}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.document_title}
                  </p>
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  <ActivityLabel action={activity.action} /> by{' '}
                  <span className="font-medium">
                    {activity.performed_by_email.split('@')[0]}
                  </span>
                  {' • '}
                  {formatTimeAgo(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
