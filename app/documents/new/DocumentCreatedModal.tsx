'use client'

import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FileEdit, Home, X } from 'lucide-react'

interface DocumentCreatedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentNumber: string
}

export default function DocumentCreatedModal({
  open,
  onOpenChange,
  documentId,
  documentNumber,
}: DocumentCreatedModalProps) {
  const router = useRouter()

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/documents/${documentId}/edit`)
  }

  const handleHome = () => {
    onOpenChange(false)
    router.push('/dashboard')
  }

  const handleClose = () => {
    onOpenChange(false)
    router.push(`/documents/${documentId}`)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            ✅ Document Created Successfully!
          </AlertDialogTitle>
          <AlertDialogDescription>
            Document <span className="font-semibold">{documentNumber}</span> has been created.
            What would you like to do next?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleEdit} className="w-full">
            <FileEdit className="mr-2 h-4 w-4" />
            Edit Document
          </Button>
          <Button onClick={handleHome} variant="outline" className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button onClick={handleClose} variant="ghost" className="w-full">
            <X className="mr-2 h-4 w-4" />
            View Document
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
