'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { promoteToProduction } from '@/app/actions/promotion'
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

interface PromoteToProductionButtonProps {
  documentId: string
  documentNumber: string
  version: string
  hasDraft?: boolean
  draftId?: string
}

export default function PromoteToProductionButton({
  documentId,
  documentNumber,
  version,
  hasDraft = false,
  draftId,
}: PromoteToProductionButtonProps) {
  const router = useRouter()
  const [isPromoting, setIsPromoting] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)

  const handlePromoteClick = () => {
    if (hasDraft) {
      setShowDraftModal(true)
    } else {
      setShowPromoteModal(true)
    }
  }

  const handleDiscardAndPromote = async () => {
    setIsPromoting(true)
    setShowDraftModal(false)

    try {
      const result = await promoteToProduction(documentId, 'discard')

      if (result.success) {
        toast.success(`Promoted to Production: ${result.documentNumber}`)
        router.push(`/documents/${result.documentId}/edit`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to promote to Production')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to promote to Production')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleConvertDraft = async () => {
    if (!draftId) return
    
    setIsPromoting(true)
    setShowDraftModal(false)

    try {
      const result = await promoteToProduction(documentId, 'convert', draftId)

      if (result.success) {
        toast.success(`Converted draft to Production`)
        router.push(`/documents?selected=${result.documentNumber}&tab=wip`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to convert draft')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert draft')
    } finally {
      setIsPromoting(false)
    }
  }

  const handlePromote = async () => {
    setIsPromoting(true)
    setShowPromoteModal(false)

    try {
      const result = await promoteToProduction(documentId, 'create')

      if (result.success) {
        toast.success(`Promoted to Production: ${result.documentNumber}`)
        router.push(`/documents/${result.documentId}/edit`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to promote to Production')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to promote to Production')
    } finally {
      setIsPromoting(false)
    }
  }

  return (
    <>
      <Button variant="outline" disabled={isPromoting} onClick={handlePromoteClick}>
        <ArrowUp className="mr-2 h-4 w-4" />
        Promote to Production
      </Button>

      {/* Draft handling modal */}
      <AlertDialog open={showDraftModal} onOpenChange={setShowDraftModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Draft Detected</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                A draft version already exists for <strong>{documentNumber}</strong>.
              </p>
              <p className="font-medium text-foreground mt-3">Choose an option:</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardAndPromote}
              disabled={isPromoting}
            >
              {isPromoting ? 'Processing...' : 'Discard Draft & Create New'}
            </Button>
            <Button
              onClick={handleConvertDraft}
              disabled={isPromoting}
            >
              {isPromoting ? 'Processing...' : 'Convert to Production Draft'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Standard promote modal (no draft) */}
      <AlertDialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Production?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will promote <strong>{documentNumber}{version}</strong> to Production.
              </p>
              <p className="font-medium text-foreground mt-3">What will happen:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Creates new Production document: <strong>{documentNumber}v1</strong></li>
                <li>New document will be Draft (requires approval)</li>
                <li>You'll need to assign approvers before submitting</li>
                <li>Files will NOT be copied (upload files again)</li>
                <li>Original Prototype stays Released</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePromote}
              disabled={isPromoting}
            >
              {isPromoting ? 'Promoting...' : 'Promote to Production'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
