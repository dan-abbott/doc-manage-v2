import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getLatestReleasedVersion } from '@/app/actions/versions'

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
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-900 mb-1">
              This document is obsolete
            </p>
            <p className="text-sm text-yellow-700">
              A newer version ({latestVersion.version}) is available
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/documents/${latestVersion.id}`}>
                <ArrowRight className="mr-2 h-4 w-4" />
                View Latest Version
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
