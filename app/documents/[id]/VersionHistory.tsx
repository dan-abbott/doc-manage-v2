import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getVersionHistory } from '@/app/actions/versions'

interface VersionHistoryProps {
  documentNumber: string
  currentVersionId: string
}

// Map status to badge color
const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  'Released': 'bg-green-500',
  'Obsolete': 'bg-gray-700',
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function VersionHistory({
  documentNumber,
  currentVersionId,
}: VersionHistoryProps) {
  const result = await getVersionHistory(documentNumber)

  if (!result.success || !result.data || result.data.length === 0) {
    return null
  }

  const versions = result.data

  // Don't show if only one version exists
  if (versions.length === 1) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Version History
          <Badge variant="secondary" className="text-xs font-normal">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {versions.map((version) => {
            const isCurrent = version.id === currentVersionId
            
            return (
              <div
                key={version.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Left side - Version and Status */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`font-mono text-xs ${isCurrent ? 'border-blue-500 text-blue-700' : ''}`}
                      >
                        {version.version}
                      </Badge>
                      <Badge className={`${statusColors[version.status]} text-white text-xs`}>
                        {version.status}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {version.status === 'Released' || version.status === 'Obsolete' ? (
                        <>
                          Released {formatDate(version.released_at)} by{' '}
                          {version.released_by_email?.split('@')[0] || 'Unknown'}
                        </>
                      ) : (
                        <>
                          Created {formatDate(version.created_at)} by{' '}
                          {version.created_by_email?.split('@')[0] || 'Unknown'}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side - Action Button */}
                {!isCurrent && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/documents/${version.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
