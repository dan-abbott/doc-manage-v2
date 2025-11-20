'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle } from 'lucide-react'
import { approveDocument } from '@/app/actions/approvals'

interface ApproveButtonProps {
  documentId: string
  documentNumber: string
}

export default function ApproveButton({ documentId, documentNumber }: ApproveButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await approveDocument(documentId, comments.trim() || undefined)

      if (result.success) {
        if (result.allApproved) {
          alert(`All approvers have approved! Document ${documentNumber} has been released.`)
        } else {
          alert('Document approved successfully. Waiting for other approvers.')
        }
        router.refresh()
      } else {
        setError(result.error || 'Failed to approve document')
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  if (!showComments) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowComments(true)}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comments (Optional)
        </label>
        <Textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add any comments about your approval..."
          rows={3}
          disabled={isSubmitting}
          maxLength={500}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Approving...' : 'Confirm Approval'}
        </Button>
        <Button
          onClick={() => {
            setShowComments(false)
            setComments('')
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
