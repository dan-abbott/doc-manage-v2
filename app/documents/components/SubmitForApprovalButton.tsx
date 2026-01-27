'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { submitForApproval } from '@/app/actions/approvals'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SubmitForApprovalButtonProps {
  documentId: string
  documentNumber: string
  approverCount: number
  fileCount?: number
}

export default function SubmitForApprovalButton({ 
  documentId, 
  documentNumber,
  approverCount,
  fileCount = 0
}: SubmitForApprovalButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const result = await submitForApproval(documentId)

      if (result.success) {
        toast.success(`Document ${documentNumber} submitted for approval!`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to submit document')
        setIsSubmitting(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={isSubmitting}
        variant="outline"
        className="border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        <Send className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Submitting...' : 'Send for Approval'}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Approval?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Submit <span className="font-medium">{documentNumber}</span> for approval?
              </p>
              <p>
                This document will be reviewed by <span className="font-medium">{approverCount}</span> approver{approverCount > 1 ? 's' : ''}. 
                You will not be able to edit it until approval is complete.
              </p>
              {fileCount === 0 && (
                <p className="text-amber-600 font-medium mt-2">
                  ⚠️ Note: This document has no files attached.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
