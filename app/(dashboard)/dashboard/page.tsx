import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, User, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get total documents count
  const { count: totalDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Get documents pending approval (where I'm an approver with Pending status and document is In Approval)
  const { data: pendingApprovals } = await supabase
    .from('approvers')
    .select('document_id, document:documents!inner(status)')
    .eq('user_email', user.email)
    .eq('status', 'Pending')
    .eq('document.status', 'In Approval')

  const pendingApprovalsCount = pendingApprovals?.length || 0

  // Get my documents (documents I created)
  const { count: myDocumentsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)

  // Get released documents count
  const { count: releasedDocumentsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Released')

  // Get recent activity (last 10 audit log entries)
  const { data: recentActivity } = await supabase
    .from('audit_log')
    .select(`
      *,
      document:documents(document_number, version, title)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user.email}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <Link href="/documents">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{totalDocuments || 0}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Approval */}
        <Link href="/approvals">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending My Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">{pendingApprovalsCount}</span>
              </div>
              {pendingApprovalsCount > 0 && (
                <p className="text-xs text-yellow-600 mt-1">Action required</p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* My Documents */}
        <Link href="/documents?filter=my">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                My Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold">{myDocumentsCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Released Documents */}
        <Link href="/documents?status=Released">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Released Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{releasedDocumentsCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {activity.document?.document_number}{activity.document?.version}
                      </span>
                      {' - '}
                      <span className="text-gray-900">{activity.document?.title}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.action.replace(/_/g, ' ')} by {activity.performed_by_email}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(activity.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/documents/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create New Document
            </Link>
            <Link
              href="/approvals"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Clock className="h-4 w-4 mr-2" />
              View My Approvals
            </Link>
            <Link
              href="/documents"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              All Documents
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
