import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { FileText, Download, Edit, Trash2 } from 'lucide-react'
import DeleteDocumentButton from './DeleteDocumentButton'
import ReleaseDocumentButton from './ReleaseDocumentButton'

interface PageProps {
  params: {
    id: string
  }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  console.log('=== DETAIL PAGE DEBUG ===')
  console.log('Document ID:', params.id)
  
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  console.log('User:', user?.email)


  // Get document with related data
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
    document_type:document_types(name, prefix),
    creator:users!documents_created_by_fkey(email),
    releaser:users!documents_released_by_fkey(email),
    document_files(*)

    `)
    .eq('id', params.id)
    .single()

  console.log('Complex query result:', document)
  console.log('Complex query error:', error)
  console.log('=== END DETAIL DEBUG ===')

  if (error || !document) {
    console.error('Query failed, returning 404')
    notFound()
  }

  // Get audit log
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*')
    .eq('document_id', params.id)
    .order('created_at', { ascending: false })

  const isCreator = document.created_by === user.id
  const isDraft = document.status === 'Draft'
  const canEdit = isCreator && isDraft
  const canDelete = isCreator && isDraft
  const canRelease = isCreator && isDraft && !document.is_production

  // Status badge color
  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-500',
    'In Approval': 'bg-yellow-500',
    Released: 'bg-green-500',
    Obsolete: 'bg-gray-700',
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{document.document_number}{document.version}</h1>
          <p className="text-muted-foreground">{document.title}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild>
              <Link href={`/documents/${document.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canDelete && (
            <DeleteDocumentButton documentId={document.id} />
          )}
          <Button variant="outline" asChild>
            <Link href="/documents">Back to List</Link>
          </Button>
        </div>
      </div>

      {/* Document Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Information</CardTitle>
            <div className="flex gap-2">
              <Badge className={statusColors[document.status] || 'bg-gray-500'}>
                {document.status}
              </Badge>
              <Badge variant="outline">
                {document.is_production ? 'Production' : 'Prototype'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Document Type</p>
              <p className="text-lg">{document.document_type?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Code</p>
              <p className="text-lg">{document.project_code || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="mt-1">{document.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p>{document.creator?.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
              </p>
            </div>
            {document.released_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Released By</p>
                <p>{document.releaser?.full_name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(document.released_at), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Release Section */}
      {canRelease && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Release Document</CardTitle>
            <CardDescription>
              Once released, this document will become read-only and visible to all users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReleaseDocumentButton 
              documentId={document.id}
              isProduction={document.is_production}
            />
          </CardContent>
        </Card>
      )}

      {/* Production Warning */}
      {document.is_production && isDraft && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Production Document</CardTitle>
            <CardDescription className="text-yellow-700">
              Production documents require an approval workflow. This feature will be available in Phase 5.
              For now, production documents cannot be released.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Files Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attached Files ({document.document_files?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {document.document_files && document.document_files.length > 0 ? (
            <div className="space-y-2">
              {document.document_files.map((file: any) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a 
                      href={`/api/documents/${document.id}/files/${file.id}/download`}
                      download={file.file_name}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No files attached to this document
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      {auditLogs && auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                  <div>
                    <span className="font-medium">{log.performed_by_email}</span>
                    {' '}
                    <span className="text-muted-foreground">{log.action}</span>
                    {log.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
