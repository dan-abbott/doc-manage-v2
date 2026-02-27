'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { deleteDocument } from '@/app/actions/documents'
import type { BaselineReqsLinksResult } from '@/lib/integrations/baselinereqs'

interface DeleteDocumentButtonProps {
  documentId: string
}

export default function DeleteDocumentButton({ documentId }: DeleteDocumentButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  // Two-phase state: if the action returns requiresAcknowledgement we show a
  // second dialog with the reference details before the user commits.
  const [refs, setRefs] = useState<BaselineReqsLinksResult | null>(null)
  const [showRefsWarning, setShowRefsWarning] = useState(false)

  /**
   * Phase 1: called when the user clicks "Delete Draft" in the initial dialog.
   * The server action checks BaselineReqs. If refs exist we surface the warning
   * dialog; otherwise the delete completes immediately.
   */
  const handleDelete = async (acknowledged = false) => {
    try {
      setIsDeleting(true)
      const result = await deleteDocument(documentId, acknowledged)

      if ('requiresAcknowledgement' in result && result.requiresAcknowledgement) {
        // Phase 2: show the warning dialog with ref details
        setRefs((result as any).refs ?? null)
        setShowRefsWarning(true)
        return
      }

      if (result.success) {
        toast.success('Document deleted successfully')
        router.push('/documents')
      } else {
        toast.error(result.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  /** Phase 2: user confirmed they want to proceed despite broken links. */
  const handleDeleteWithAcknowledgement = () => {
    setShowRefsWarning(false)
    handleDelete(true)
  }

  return (
    <>
      {/* ── Initial confirm dialog ─────────────────────────────────────── */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Draft
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the draft document
              and all its attached files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Checking...' : 'Delete Draft'}
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
                <p className="text-sm font-medium">
                  Do you still want to delete this document?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWithAcknowledgement}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
