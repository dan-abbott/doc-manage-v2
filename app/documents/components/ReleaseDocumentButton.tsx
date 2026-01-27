'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { releaseDocument } from '@/app/actions/documents'
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

interface ReleaseDocumentButtonProps {
  documentId: string
  isProduction: boolean
  documentNumber?: string
  fileCount?: number
}

export default function ReleaseDocumentButton({ 
  documentId, 
  isProduction,
  documentNumber = '',
  fileCount = 0
}: ReleaseDocumentButtonProps) {
  const router = useRouter()
  const [isReleasing, setIsReleasing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRelease = async () => {
    // Production documents can't be released yet (Phase 5 feature)
    if (isProduction) {
      toast.error('Production documents require approval workflow (coming in Phase 5)')
      return
    }

    try {
      setIsReleasing(true)
      const result = await releaseDocument(documentId)

      if (result.success) {
        toast.success('Document released successfully')
        setShowConfirm(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to release document')
      }
    } catch (error) {
      console.error('Release error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <>
      <Button 
        onClick={() => setShowConfirm(true)}
        disabled={isReleasing || isProduction}
        variant="outline"
        className="border-green-200 text-green-700 hover:bg-green-50"
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        {isReleasing ? 'Releasing...' : 'Release'}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Document?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Release <span className="font-medium">{documentNumber}</span> without approval?
              </p>
              <p>
                This document will become active and read-only. You will not be able to edit it after release.
              </p>
              {fileCount === 0 && (
                <p className="text-amber-600 font-medium mt-2">
                  ⚠️ Note: This document has no files attached.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReleasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRelease}
              disabled={isReleasing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReleasing ? 'Releasing...' : 'Release Document'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
      variant="outline"
      className="border-green-200 text-green-700 hover:bg-green-50"
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      {isReleasing ? 'Releasing...' : 'Release'}
    </Button>
  )
}
