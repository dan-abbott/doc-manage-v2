import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, User, CheckCircle, Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getGreetingWithName } from '@/lib/utils/greetings'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user's full name for greeting
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const greeting = getGreetingWithName(userData?.full_name)

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

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {greeting}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your documents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <Link href="/documents">
          <Card className="hover:shadow-lg cursor-pointer transition-all hover:border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                Total Documents
                <FileText className="h-4 w-4 text-gray-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalDocuments || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Click to view all</p>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Approval */}
        <Link href="/approvals">
          <Card className="hover:shadow-lg cursor-pointer transition-all hover:border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                Pending Approvals
                <Clock className="h-4 w-4 text-gray-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{pendingApprovalsCount}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting your review</p>
            </CardContent>
          </Card>
        </Link>

        {/* My Documents */}
        <Link href="/documents?filter=my">
          <Card className="hover:shadow-lg cursor-pointer transition-all hover:border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                My Documents
                <User className="h-4 w-4 text-gray-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{myDocumentsCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Documents you created</p>
            </CardContent>
          </Card>
        </Link>

        {/* Released Documents */}
        <Link href="/documents?status=Released">
          <Card className="hover:shadow-lg cursor-pointer transition-all hover:border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                Released Documents
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{releasedDocumentsCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Active documents</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions - NOW ABOVE RECENT ACTIVITY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button asChild>
              <Link href="/documents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Document
              </Link>
            </Button>
            {pendingApprovalsCount > 0 && (
              <Button variant="outline" asChild>
                <Link href="/approvals">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  My Approvals ({pendingApprovalsCount})
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/documents">
                <FileText className="mr-2 h-4 w-4" />
                View All Documents
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - NOW BELOW QUICK ACTIONS */}
      <RecentActivityFeed />
    </div>
  )
}
