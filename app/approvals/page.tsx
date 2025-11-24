import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function MyApprovalsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Get documents pending this user's approval
  const { data: approvals, error } = await supabase
    .from('approvers')
    .select(`
      id,
      status,
      created_at,
      document:documents(
        id,
        document_number,
        version,
        title,
        status,
        is_production,
        created_at,
        creator:users!documents_created_by_fkey(email)
      )
    `)
    .eq('user_email', user.email)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching approvals:', error)
  }

  const pendingApprovals = approvals || []

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Approvals</h1>
        <p className="text-gray-600">
          Documents awaiting your review and approval
        </p>
      </div>

      {/* Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary">
                {pendingApprovals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-sm text-gray-500">
                You have no documents pending your approval.
              </p>
            </div>
          ) : (
            // Approvals list
            <div className="space-y-4">
              {pendingApprovals.map((approval: any) => {
                const doc = approval.document
                if (!doc) return null

                return (
                  <Link 
                    key={approval.id}
                    href={`/documents/${doc.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">
                              {doc.document_number}{doc.version}
                            </p>
                            <Badge 
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200"
                            >
                              {doc.status}
                            </Badge>
                            {doc.is_production && (
                              <Badge variant="outline">Production</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2 truncate">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              Submitted by {doc.creator?.email?.split('@')[0] || 'Unknown'}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
