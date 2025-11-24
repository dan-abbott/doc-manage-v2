import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Clock, User, CheckCircle, Plus, ClipboardList } from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed'
import { getDashboardStats } from '@/app/actions/dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { getGreeting } from '@/lib/utils/greetings'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/')
  }

  // Get user's full name for greeting
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const fullName = userData?.full_name || ''
  const firstName = fullName.split(' ')[0] || 'there'
  const greeting = getGreeting(firstName)

  // Get dashboard statistics
  const statsResult = await getDashboardStats()
  const stats = statsResult.data

  // Get pending approvals count for conditional display
  const hasPendingApprovals = stats.pendingApprovals > 0

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header with Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {greeting}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your documents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Documents"
          value={stats.totalDocuments}
          description="Click to view all"
          icon={FileText}
          href="/documents"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          description="Awaiting your review"
          icon={Clock}
          href="/approvals"
        />
        <StatCard
          title="My Documents"
          value={stats.myDocuments}
          description="Documents you created"
          icon={User}
          href="/documents?filter=my"
        />
        <StatCard
          title="Released Documents"
          value={stats.releasedDocuments}
          description="Active documents"
          icon={CheckCircle}
          href="/documents?status=released"
        />
      </div>

      {/* Quick Actions Section */}
      <Card className="mb-8">
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
            {hasPendingApprovals && (
              <Button variant="outline" asChild>
                <Link href="/approvals">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  My Approvals ({stats.pendingApprovals})
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

      {/* Recent Activity Feed */}
      <div className="mb-8">
        <RecentActivityFeed />
      </div>
    </div>
  )
}
