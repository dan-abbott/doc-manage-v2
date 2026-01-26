'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import ApproveButton from './ApproveButton'
import RejectButton from './RejectButton'

interface Approver {
  id: string
  user_id: string
  user_email: string
  status: 'Pending' | 'Approved' | 'Rejected'
  comments: string | null
  action_date: string | null
}

interface ApprovalWorkflowProps {
  approvers: Approver[]
  documentId: string
  documentNumber: string
  documentStatus: string
  currentUserId: string
  currentUserEmail: string
}

export default function ApprovalWorkflow({
  approvers,
  documentId,
  documentNumber,
  documentStatus,
  currentUserId,
  currentUserEmail
}: ApprovalWorkflowProps) {
  // Don't show if no approvers
  if (!approvers || approvers.length === 0) {
    return null
  }

  // Calculate approval progress
  const totalApprovers = approvers.length
  const approvedCount = approvers.filter(a => a.status === 'Approved').length
  const rejectedCount = approvers.filter(a => a.status === 'Rejected').length
  const pendingCount = approvers.filter(a => a.status === 'Pending').length

  // Check if current user is an approver
  const currentUserApprover = approvers.find(a => a.user_email === currentUserEmail)
  const isCurrentUserPendingApprover = 
    currentUserApprover && 
    currentUserApprover.status === 'Pending' && 
    documentStatus === 'In Approval'

  // Get status icon and color
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

  // Find rejection if any
  const rejectedApprover = approvers.find(a => a.status === 'Rejected')

  return (
    <Card className="mb-6 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Approval Workflow</span>
          <span className="text-sm font-normal text-gray-600">
            {approvedCount} of {totalApprovers} approved
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Approval Progress</span>
            <span>{Math.round((approvedCount / totalApprovers) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${(approvedCount / totalApprovers) * 100}%` }}
            />
          </div>
        </div>

        {/* Rejection Notice */}
        {rejectedApprover && documentStatus === 'Draft' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 mb-1">Document Rejected</p>
                <p className="text-sm text-red-800 mb-2">
                  Rejected by: {rejectedApprover.user_email}
                </p>
                {rejectedApprover.comments && (
                  <div className="mt-2 p-3 bg-white border border-red-200 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-gray-900">{rejectedApprover.comments}</p>
                  </div>
                )}
                <p className="text-sm text-red-700 mt-2">
                  Please review the feedback, make necessary changes, and resubmit for approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approvers List */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Approvers</h4>
          {approvers.map((approver) => (
            <div
              key={approver.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(approver.status)}
                  <span className="font-medium">{approver.user_email}</span>
                </div>
                {getStatusBadge(approver.status)}
              </div>

              {approver.action_date && (
                <p className="text-xs text-gray-500 mb-1">
                  {approver.status === 'Approved' ? 'Approved' : 'Rejected'} on{' '}
                  {new Date(approver.action_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}

              {approver.comments && (
                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">Comments:</p>
                  <p className="text-sm text-gray-900">{approver.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Approval Actions for Current User */}
        {isCurrentUserPendingApprover && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Your Action Required</h4>
            <p className="text-sm text-gray-600 mb-4">
              Please review the document and its attachments before approving or rejecting.
            </p>
            <div className="flex gap-3">
              <ApproveButton 
                documentId={documentId} 
                documentNumber={documentNumber}
              />
              <RejectButton 
                documentId={documentId}
                documentNumber={documentNumber}
              />
            </div>
          </div>
        )}

        {/* Status Messages */}
        {documentStatus === 'In Approval' && !isCurrentUserPendingApprover && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              {currentUserApprover 
                ? `You have ${currentUserApprover.status.toLowerCase()} this document. Waiting for other approvers.`
                : 'This document is awaiting approval from assigned approvers.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
