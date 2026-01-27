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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PromoteToProductionButtonProps {
  documentId: string
  documentNumber: string
  version: string
}

export default function PromoteToProductionButton({
  documentId,
  documentNumber,
  version,
}: PromoteToProductionButtonProps) {
  const router = useRouter()
  const [isPromoting, setIsPromoting] = useState(false)

  const handlePromote = async () => {
    setIsPromoting(true)

    try {
      const result = await promoteToProduction(documentId)

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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" disabled={isPromoting} className="w-full">
          <ArrowUp className="mr-2 h-4 w-4" />
          Promote to Production
        </Button>
      </AlertDialogTrigger>
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
              <li>Original Prototype stays Released (not obsoleted)</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Production documents use numeric versioning (v1, v2, v3) 
                and always require approval before release.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePromote} disabled={isPromoting}>
            {isPromoting ? 'Promoting...' : 'Promote to Production'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
