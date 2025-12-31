'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { XCircle } from 'lucide-react'
import { rejectDocument } from '@/app/actions/approvals'

interface RejectButtonProps {
  documentId: string
  documentNumber: string
}

export default function RejectButton({ documentId, documentNumber }: RejectButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejection, setShowRejection] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await rejectDocument(documentId, rejectionReason.trim())

      if (result.success) {
        alert(`Document ${documentNumber} has been rejected and returned to Draft status.`)
        // Force full page reload to show updated status
        window.location.reload()
      } else {
        setError(result.error || 'Failed to reject document')
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  if (!showRejection) {
    return (
      <div className="space-y-2">
        <Button
          onClick={() => setShowRejection(true)}
          disabled={isSubmitting}
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-red-900 mb-2">
          Rejection Reason <span className="text-red-600">*</span>
        </label>
        <Textarea
          value={rejectionReason}
          onChange={(e) => {
            setRejectionReason(e.target.value)
            setError(null)
          }}
          placeholder="Please explain why you are rejecting this document..."
          rows={4}
          disabled={isSubmitting}
          maxLength={1000}
          className="bg-white"
          required
        />
        <p className="text-xs text-gray-600 mt-1">
          The document will return to Draft status and the creator will see your reason.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleReject}
          disabled={isSubmitting || !rejectionReason.trim()}
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
        </Button>
        <Button
          onClick={() => {
            setShowRejection(false)
            setRejectionReason('')
            setError(null)
          }}
          disabled={isSubmitting}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
