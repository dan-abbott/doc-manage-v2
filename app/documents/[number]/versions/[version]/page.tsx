import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, ArrowLeft, AlertTriangle } from 'lucide-react'
import { fetchSpecificVersion } from '@/lib/document-helpers'

interface PageProps {
  params: {
    number: string
    version: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  'Released': 'bg-green-500',
  'Obsolete': 'bg-gray-700',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ObsoleteVersionPage({ params }: PageProps) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
 
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch the specific version
  const version = await fetchSpecificVersion(params.number, params.version)

  if (!version) {
    redirect('/documents')
  }

  const files = version.document_files || []
  const approvers = version.approvers || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href={`/documents?selected=${params.number}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Current Version
          </Link>
        </Button>

        {/* Obsolete Warning Banner */}
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-900">
              This is an obsolete version
            </p>
            <p className="text-sm text-orange-700 mt-1">
              This version has been superseded. It is retained for historical reference only and should not be used for current work.
            </p>
          </div>
        </div>

        {/* Document Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              {version.document_number}{version.version}
            </h1>
            <Badge className={STATUS_COLORS[version.status]}>
              {version.status}
            </Badge>
            {version.is_production && (
              <Badge variant="outline">Production</Badge>
            )}
          </div>
          <p className="text-xl text-gray-600">{version.title}</p>
        </div>

        {/* Document Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            {version.description && (
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-700">{version.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Document Type</p>
                  <p className="text-sm text-gray-900">{version.document_type?.name || 'Unknown'}</p>
                </div>
                
                {version.project_code && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Project Code</p>
                    <p className="text-sm font-mono text-gray-900">{version.project_code}</p>
                  </div>
                )}
                
                {approvers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Approvers</p>
                    <p className="text-sm text-gray-900">
                      {approvers.length} approver{approvers.length > 1 ? 's' : ''} assigned
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Created</p>
                  <p className="text-sm text-gray-900" suppressHydrationWarning>
                    {formatDate(version.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">{version.creator?.email?.split('@')[0] || 'Unknown'}</p>
                </div>
                
                {version.released_at && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Released</p>
                    <p className="text-sm text-gray-900" suppressHydrationWarning>
                      {formatDate(version.released_at)}
                    </p>
                    <p className="text-xs text-gray-500">{version.releaser?.email?.split('@')[0] || 'Unknown'}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attached Files */}
        <Card>
          <CardHeader>
            <CardTitle>Attached Files</CardTitle>
          </CardHeader>
          <CardContent>
            {files && files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.original_file_name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`/api/documents/${version.id}/files/${file.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No files attached</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
