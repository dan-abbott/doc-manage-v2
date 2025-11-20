import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react'

export default async function MyApprovalsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Get all approvals for current user
  const { data: approvals, error } = await supabase
    .from('approvers')
    .select(`
      *,
      document:documents (
        id,
        document_number,
        version,
        title,
        status,
        is_production,
        created_at,
        project_code,
        creator:users!documents_created_by_fkey (
          email
        ),
        document_type:document_types (
          name
        )
      )
    `)
    .eq('user_email', user.email)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch approvals error:', error)
  }

  const approvalsList = approvals || []

  // Categorize approvals
  const pendingApprovals = approvalsList.filter(a => 
    a.status === 'Pending' && a.document.status === 'In Approval'
  )
  const approvedApprovals = approvalsList.filter(a => a.status === 'Approved')
  const rejectedApprovals = approvalsList.filter(a => a.status === 'Rejected')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'Rejected':
        return <Badge className="bg-red-600">Rejected</Badge>
      case 'Pending':
        return <Badge className="bg-yellow-600">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const ApprovalCard = ({ approval }: { approval: any }) => (
    <Link href={`/documents/${approval.document.id}`}>
      <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {getStatusIcon(approval.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">
                    {approval.document.document_number}{approval.document.version}
                  </h3>
                  {approval.document.is_production && (
                    <Badge variant="outline" className="text-xs">Production</Badge>
                  )}
                </div>
                <p className="text-gray-700 mb-2 truncate">{approval.document.title}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>Type: {approval.document.document_type?.name}</span>
                  {approval.document.project_code && (
                    <span>Project: {approval.document.project_code}</span>
                  )}
                  <span>By: {approval.document.creator?.email}</span>
                </div>
                {approval.action_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    {approval.status === 'Approved' ? 'Approved' : 'Rejected'} on{' '}
                    {new Date(approval.action_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(approval.status)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Approvals</h1>
        <p className="text-gray-600">
          Documents assigned to you for approval
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{pendingApprovals.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{approvedApprovals.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{rejectedApprovals.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Approval ({pendingApprovals.length})
        </h2>
        {pendingApprovals.length > 0 ? (
          <div className="space-y-3">
            {pendingApprovals.map(approval => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No documents pending your approval</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Approved Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Approved ({approvedApprovals.length})
        </h2>
        {approvedApprovals.length > 0 ? (
          <div className="space-y-3">
            {approvedApprovals.map(approval => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No approved documents</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Rejected Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          Rejected ({rejectedApprovals.length})
        </h2>
        {rejectedApprovals.length > 0 ? (
          <div className="space-y-3">
            {rejectedApprovals.map(approval => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No rejected documents</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
