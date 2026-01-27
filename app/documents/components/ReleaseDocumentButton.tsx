'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { releaseDocument } from '@/app/actions/documents'

interface ReleaseDocumentButtonProps {
  documentId: string
  isProduction: boolean
}

export default function ReleaseDocumentButton({ 
  documentId, 
  isProduction 
}: ReleaseDocumentButtonProps) {
  const router = useRouter()
  const [isReleasing, setIsReleasing] = useState(false)

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
    <Button 
      onClick={handleRelease}
      disabled={isReleasing || isProduction}
      className="w-full"
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      {isReleasing ? 'Releasing...' : 'Release'}
    </Button>
  )
}
