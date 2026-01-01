'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { adminDeleteDocument } from '@/app/actions/admin'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface AdminDeleteButtonProps {
  documentId: string
  documentNumber: string
  version: string
  status: string
}

export default function AdminDeleteButton({
  documentId,
  documentNumber,
  version,
  status,
}: AdminDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const result = await adminDeleteDocument(documentId)
      
      if (result.success) {
        toast.success('Document Deleted', {
          description: result.message || 'Document has been permanently deleted'
        })
        
        // Redirect to documents list
        router.push('/documents')
      } else {
        toast.error('Delete Failed', {
          description: result.error || 'Failed to delete document'
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Delete Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          Admin Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            ⚠️ Force Delete Document
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold">
              You are about to permanently delete:
            </p>
            <div className="bg-gray-100 p-3 rounded-md space-y-1 text-sm">
              <p><strong>Document:</strong> {documentNumber}{version}</p>
              <p><strong>Status:</strong> {status}</p>
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded-md space-y-2">
              <p className="font-semibold text-red-800">This action will:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                <li>Permanently delete the document record</li>
                <li>Delete all associated files from storage</li>
                <li>Delete all approver records</li>
                <li>Delete all audit logs (except deletion record)</li>
                <li>Cannot be undone</li>
              </ul>
            </div>
            <p className="text-sm font-semibold">
              An audit trail of this deletion will be preserved.
            </p>
            <p className="text-sm font-semibold text-red-600">
              Are you absolutely sure?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
