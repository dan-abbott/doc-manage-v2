'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { submitForApproval } from '@/app/actions/approvals'

interface SubmitForApprovalButtonProps {
  documentId: string
  documentNumber: string
  approverCount: number
}

export default function SubmitForApprovalButton({ 
  documentId, 
  documentNumber,
  approverCount 
}: SubmitForApprovalButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Confirm submission
    const confirmed = confirm(
      `Submit ${documentNumber} for approval?\n\n` +
      `This document will be reviewed by ${approverCount} approver${approverCount > 1 ? 's' : ''}. ` +
      `You will not be able to edit it until approval is complete.`
    )

    if (!confirmed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitForApproval(documentId)

      if (result.success) {
        alert(`Document ${documentNumber} submitted for approval!`)
        router.refresh()
      } else {
        setError(result.error || 'Failed to submit document')
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Send className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
