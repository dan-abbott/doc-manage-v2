import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getLatestReleasedVersion } from '@/app/actions/versions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface SeeLatestReleasedButtonProps {
  documentNumber: string
  currentVersion: string
}

export default async function SeeLatestReleasedButton({
  documentNumber,
  currentVersion,
}: SeeLatestReleasedButtonProps) {
  const result = await getLatestReleasedVersion(documentNumber)

  if (!result.success || !result.data) {
    return null
  }

  const latestVersion = result.data

  // Don't show if we're already viewing the latest released version
  if (latestVersion.version === currentVersion) {
    return null
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-medium text-yellow-900">
            This document is obsolete
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            A newer version ({latestVersion.version}) is available
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="ml-4">
          <Link href={`/documents/${latestVersion.id}`}>
            <ArrowRight className="mr-2 h-4 w-4" />
            View Latest Version
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
