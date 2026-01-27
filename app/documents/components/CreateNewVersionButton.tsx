'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createNewVersion } from '@/app/actions/versions'
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

interface CreateNewVersionButtonProps {
  documentId: string
  documentNumber: string
  version: string
  isProduction: boolean
}

export default function CreateNewVersionButton({
  documentId,
  documentNumber,
  version,
  isProduction,
}: CreateNewVersionButtonProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateVersion = async () => {
    setIsCreating(true)

    try {
      const result = await createNewVersion(documentId)

      if (result.success) {
        toast.success(`Version ${result.version} created successfully`)
        router.push(`/documents/${result.documentId}/edit`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create new version')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create new version')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={isCreating} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Version
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Version?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will create a new version of document <strong>{documentNumber}{version}</strong>.
            </p>
            <p>
              The new version will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Start as a Draft</li>
              <li>Inherit the document metadata (title, description, project)</li>
              <li>NOT copy any files (you'll need to upload files again)</li>
              <li>Require approval before release{isProduction ? ' (Production document)' : ''}</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              When the new version is released, this version will become Obsolete.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCreating}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreateVersion} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Version'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
