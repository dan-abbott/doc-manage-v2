'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface VersionHistoryProps {
  documentNumber: string
  currentVersionId: string
}

interface Version {
  id: string
  version: string
  status: string
  released_at: string | null
  released_by: string | null
  releaser?: {
    email: string
    full_name: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  'Released': 'bg-green-500',
  'Obsolete': 'bg-gray-700',
}

export default function VersionHistory({ documentNumber, currentVersionId }: VersionHistoryProps) {
  const router = useRouter()
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchVersions() {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          version,
          status,
          released_at,
          released_by,
          releaser:users!documents_released_by_fkey(email, full_name)
        `)
        .eq('document_number', documentNumber)
        .order('version', { ascending: false })

      if (error) {
        console.error('Error fetching versions:', error)
        setLoading(false)
        return
      }

      setVersions(data || [])
      setLoading(false)
    }

    fetchVersions()
  }, [documentNumber, mounted])

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading version history...</p>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No version history available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version) => (
            <button
              key={version.id}
              onClick={() => {
                if (version.id !== currentVersionId) {
                  router.replace(`/documents?selected=${version.id}`)
                }
              }}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                version.id === currentVersionId
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {documentNumber}{version.version}
                  </span>
                  {version.id === currentVersionId && (
                    <span className="text-xs text-blue-600 font-medium">
                      (Current)
                    </span>
                  )}
                </div>
                <Badge className={STATUS_COLORS[version.status]}>
                  {version.status}
                </Badge>
              </div>
              
              {version.released_at && (
                <div className="text-xs text-gray-600">
                  <span suppressHydrationWarning>
                    Released {formatDistanceToNow(new Date(version.released_at), { addSuffix: true })}
                  </span>
                  {version.releaser && (
                    <span className="ml-2">
                      by {version.releaser.email.split('@')[0]}
                    </span>
                  )}
                </div>
              )}
              
              {!version.released_at && version.status === 'Draft' && (
                <div className="text-xs text-gray-500">
                  Not yet released
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
