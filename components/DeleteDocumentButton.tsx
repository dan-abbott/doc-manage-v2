'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface DeleteDocumentButtonProps {
  documentId: string
  documentNumber: string
  deleteAction: (documentId: string) => Promise<{ success: boolean; error?: string }>
}

export function DeleteDocumentButton({ 
  documentId, 
  documentNumber,
  deleteAction 
}: DeleteDocumentButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    setShowConfirm(false)

    try {
      const result = await deleteAction(documentId)

      if (result.success) {
        toast.success(`Document ${documentNumber} deleted successfully`)
        router.push('/documents')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete document')
        setIsDeleting(false)
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'An unexpected error occurred')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleDelete}
        title="Delete Document?"
        description={`Are you sure you want to delete ${documentNumber}? This action cannot be undone. All files and data associated with this document will be permanently removed.`}
        confirmText="Delete Document"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}
