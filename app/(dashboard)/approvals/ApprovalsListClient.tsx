'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ApprovalModal from '@/app/documents/components/ApprovalModal'

interface ApprovalItemProps {
  approval: any
}

export default function ApprovalsListClient({ approvals }: { approvals: any[] }) {
  const [selectedApproval, setSelectedApproval] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Categorize approvals
  const pendingApprovals = approvals.filter(a => 
    a.status === 'Pending' && a.document?.status === 'In Approval'
  )
  const completedApprovals = approvals.filter(a => 
    a.status === 'Approved' || a.status === 'Rejected'
  )

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
        return <Badge className="bg-yellow-500">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleApprovalClick = (approval: any) => {
    if (approval.status === 'Pending' && approval.document?.status === 'In Approval') {
      console.log('Opening approval modal with document:', approval.document)
      setSelectedApproval(approval)
      setModalOpen(true)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Pending Approvals */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Your Approval ({pendingApprovals.length})
          </h2>
          
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-4">
                  No pending approvals
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <Card 
                  key={approval.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleApprovalClick(approval)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(approval.status)}
                          <span className="font-mono text-sm font-medium">
                            {approval.document.document_number}{approval.document.version}
                          </span>
                          {approval.document.is_production && (
                            <Badge variant="outline" className="text-xs">Production</Badge>
                          )}
                          {approval.document.document_type && (
                            <Badge variant="secondary" className="text-xs">
                              {approval.document.document_type.name}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-base mb-1">{approval.document.title}</h3>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                          <span>Created by: {approval.document.creator?.email?.split('@')[0]}</span>
                          {approval.document.project_code && (
                            <span>Project: {approval.document.project_code}</span>
                          )}
                          <span suppressHydrationWarning>Submitted: {formatDate(approval.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(approval.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprovalClick(approval)
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Approvals */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Completed ({completedApprovals.length})
          </h2>
          
          {completedApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-4">
                  No completed approvals
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedApprovals.slice(0, 10).map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(approval.status)}
                          <span className="font-mono text-sm font-medium">
                            {approval.document.document_number}{approval.document.version}
                          </span>
                          {approval.document.is_production && (
                            <Badge variant="outline" className="text-xs">Production</Badge>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-base mb-1">{approval.document.title}</h3>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                          {approval.action_date && (
                            <span suppressHydrationWarning>
                              {approval.status === 'Approved' ? 'Approved' : 'Rejected'}: {formatDate(approval.action_date)}
                            </span>
                          )}
                        </div>

                        {approval.comments && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <span className="font-medium">Comment: </span>
                            {approval.comments}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(approval.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {selectedApproval && (
        <ApprovalModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          document={selectedApproval.document}
          approverId={selectedApproval.id}
        />
      )}
    </>
  )
}
