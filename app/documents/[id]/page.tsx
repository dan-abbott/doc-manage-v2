import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Calendar, User, Package } from 'lucide-react'
import ReleaseDocumentButton from './ReleaseDocumentButton'
import SubmitForApprovalButton from './SubmitForApprovalButton'
import DeleteDocumentButton from './DeleteDocumentButton'
import ChangeOwnerButton from './ChangeOwnerButton'
import ApprovalWorkflow from './ApprovalWorkflow'

interface PageProps {
  params: { id: string }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    notFound()
  }

  // Check if current user is admin
  const { data: currentUserData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = currentUserData?.is_admin || false

  // Get document with relationships
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_type:document_types(name, prefix),
      creator:users!documents_created_by_fkey(email),
      releaser:users!documents_released_by_fkey(email),
      document_files(*),
      approvers!approvers_document_id_fkey(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !document) {
    console.error('Document fetch error:', error)
    notFound()
  }

  // Check if current user is the creator
  const isCreator = document.created_by === user.id

  // Get approver count
  const approverCount = document.approvers?.length || 0
  const hasApprovers = approverCount > 0

  // Determine button visibility and actions
  const canEdit = (isCreator || isAdmin) && document.status === 'Draft'
  const canDelete = (isCreator || isAdmin) && document.status === 'Draft'
  
  // Determine release/submit logic
  const canRelease = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' && 
    !document.is_production &&
    !hasApprovers // Only show Release if no approvers
  
  const canSubmitForApproval = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' &&
    hasApprovers // Only show Submit if has approvers

  // Status badge colors
  const statusColors: Record<string, string> = {
    'Draft': 'bg-gray-500',
    'In Approval': 'bg-yellow-500',
    'Released': 'bg-green-500',
    'Obsolete': 'bg-gray-700',
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/documents" className="text-sm text-blue-600 hover:underline">
          ← Back to All Documents
        </Link>
      </div>

      {/* Document Title and Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">
            {document.document_number}{document.version}
          </h1>
          <Badge className={statusColors[document.status]}>
            {document.status}
          </Badge>
          {document.is_production && (
            <Badge variant="outline">Production</Badge>
          )}
        </div>
        <p className="text-xl text-gray-600">{document.title}</p>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeOwnerButton 
              documentId={document.id}
              currentOwnerEmail={document.creator?.email || 'Unknown'}
            />
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow Section */}
      {hasApprovers && (
        <ApprovalWorkflow
          approvers={document.approvers}
          documentId={document.id}
          documentNumber={`${document.document_number}${document.version}`}
          documentStatus={document.status}
          currentUserId={user.id}
          currentUserEmail={user.email || ''}
        />
      )}

      {/* Document Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Package className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Document Type</p>
              <p className="text-base">{document.document_type?.name || 'Unknown'}</p>
            </div>
          </div>

          {document.project_code && (
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Project Code</p>
                <p className="text-base font-mono">{document.project_code}</p>
              </div>
            </div>
          )}

          {document.description && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
              <p className="text-base text-gray-700">{document.description}</p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <User className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Created By</p>
              <p className="text-base">{document.creator?.email || 'Unknown'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-base">
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {document.released_at && (
            <>
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Released By</p>
                  <p className="text-base">{document.releaser?.email || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Released At</p>
                  <p className="text-base">
                    {new Date(document.released_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Attached Files */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attached Files</CardTitle>
        </CardHeader>
        <CardContent>
          {document.document_files && document.document_files.length > 0 ? (
            <div className="space-y-2">
              {document.document_files.map((file: any) => (
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
                      href={`/api/documents/${document.id}/files/${file.id}/download`}
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

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        {canEdit && (
          <Button asChild>
            <Link href={`/documents/${document.id}/edit`}>
              Edit Document
            </Link>
          </Button>
        )}

        {canRelease && (
          <ReleaseDocumentButton 
            documentId={document.id}
            isProduction={document.is_production}
          />
        )}

        {canSubmitForApproval && (
          <SubmitForApprovalButton
            documentId={document.id}
            documentNumber={`${document.document_number}${document.version}`}
            approverCount={approverCount}
          />
        )}

        {canDelete && (
          <DeleteDocumentButton documentId={document.id} />
        )}

        {!canEdit && !canRelease && !canSubmitForApproval && !canDelete && (
          <>
            {document.status === 'Released' && (
              <p className="text-sm text-gray-500 italic">
                This document is released and read-only
              </p>
            )}
            {document.status === 'In Approval' && !hasApprovers && (
              <p className="text-sm text-gray-500 italic">
                This document is awaiting approval
              </p>
            )}
            {document.status === 'Obsolete' && (
              <p className="text-sm text-gray-500 italic">
                This document version has been superseded
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
