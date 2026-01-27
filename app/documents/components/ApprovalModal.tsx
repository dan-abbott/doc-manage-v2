'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react'
import { approveDocument, rejectDocument } from '@/app/actions/approvals'
import { toast } from 'sonner'
import Link from 'next/link'

interface ApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: string
    document_number: string
    version: string
    title: string
    description: string | null
    is_production: boolean
    document_type?: {
      name: string
      prefix: string
    }
    document_files?: Array<{
      id: string
      file_name: string
      file_size: number
    }>
    project_code?: string | null
  }
  approverId: string
}

export default function ApprovalModal({
  open,
  onOpenChange,
  document,
  approverId
}: ApprovalModalProps) {
  const router = useRouter()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [approveComments, setApproveComments] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      const result = await approveDocument(document.id, approveComments || undefined)
      
      if (result.success) {
        toast.success('Document approved')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve document')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve document')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await rejectDocument(document.id, rejectReason)
      
      if (result.success) {
        toast.success('Document rejected and returned to draft')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject document')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject document')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setShowRejectForm(false)
    setApproveComments('')
    setRejectReason('')
    onOpenChange(false)
  }

  // Debug: Log document data
  console.log('ApprovalModal document:', document)
  console.log('Document files:', document.document_files)
  console.log('Document description:', document.description)

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Document for Approval
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the document details and approve or reject
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Document Header */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">
                {document.document_number}{document.version}
              </h3>
              {document.is_production && (
                <Badge variant="outline">Production</Badge>
              )}
              {document.document_type && (
                <Badge variant="secondary">{document.document_type.name}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{document.title}</p>
          </div>

          {/* Document Details */}
          <div className="space-y-3">
            {document.description && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-700 mt-1">{document.description}</p>
              </div>
            )}

            {document.project_code && (
              <div>
                <Label className="text-sm font-medium">Project Code</Label>
                <p className="text-sm text-gray-700 mt-1">{document.project_code}</p>
              </div>
            )}

            {/* Attached Files */}
            {document.document_files && document.document_files.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Attached Files ({document.document_files.length})</Label>
                <div className="mt-2 space-y-1">
                  {document.document_files.map((file) => (
                    <div key={file.id} className="text-sm text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{file.file_name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Approve/Reject Forms */}
          {!showRejectForm ? (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label htmlFor="approve-comments" className="text-sm font-medium">
                  Comments (optional)
                </Label>
                <Textarea
                  id="approve-comments"
                  value={approveComments}
                  onChange={(e) => setApproveComments(e.target.value)}
                  placeholder="Add any comments about your approval..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label htmlFor="reject-reason" className="text-sm font-medium text-red-700">
                  Rejection Reason (required) *
                </Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain why you are rejecting this document..."
                  className="mt-1 border-red-200 focus:border-red-400"
                  rows={4}
                  required
                />
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {/* View Full Document Link */}
          <Button
            variant="ghost"
            asChild
            className="w-full sm:w-auto sm:mr-auto"
          >
            <Link 
              href={`/documents?selected=${document.document_number}&version=${document.version}`}
              target="_blank"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Document
            </Link>
          </Button>

          {!showRejectForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Approving...' : 'Approve'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting || !rejectReason.trim()}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
