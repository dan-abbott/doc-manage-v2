'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
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
import type { BaselineReqsLinksResult } from '@/lib/integrations/baselinereqs'

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
  const [refs, setRefs] = useState<BaselineReqsLinksResult | null>(null)
  const [showRefsWarning, setShowRefsWarning] = useState(false)
  const router = useRouter()

  const handleDelete = async (acknowledged = false) => {
    setIsDeleting(true)
    
    try {
      const result = await adminDeleteDocument(documentId, acknowledged)

      if ('requiresAcknowledgement' in result && result.requiresAcknowledgement) {
        setRefs((result as any).refs ?? null)
        setShowRefsWarning(true)
        return
      }
      
      if (result.success) {
        toast.success('Document Deleted', {
          description: result.message || 'Document has been permanently deleted'
        })
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

  const handleDeleteWithAcknowledgement = () => {
    setShowRefsWarning(false)
    handleDelete(true)
  }

  return (
    <>
      {/* ── Initial confirm dialog ─────────────────────────────────────── */}
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
            <AlertDialogDescription asChild>
              <div className="space-y-3">
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
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Checking...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── BaselineReqs reference warning (phase 2) ──────────────────── */}
      <AlertDialog open={showRefsWarning} onOpenChange={setShowRefsWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Referenced in BaselineReqs
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This document is linked from{' '}
                  <strong>{refs?.count} item{refs?.count === 1 ? '' : 's'}</strong> in
                  BaselineReqs. Deleting it will mark those links as broken.
                </p>
                {refs?.references && refs.references.length > 0 && (
                  <ul className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm space-y-1">
                    {refs.references.map((ref) => (
                      <li key={ref.attachment_id} className="text-amber-900">
                        <span className="font-medium">{ref.item_req_number}</span>
                        {' — '}
                        {ref.item_title}
                        <span className="text-amber-700 text-xs ml-1">
                          ({ref.project_name})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm font-medium text-red-700">
                  As an admin delete, this will also remove the document regardless of its current status.
                  Do you still want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWithAcknowledgement}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
