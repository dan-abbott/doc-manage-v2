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
import AuditTrail from './AuditTrail'
import CreateNewVersionButton from './CreateNewVersionButton'
import SeeLatestReleasedButton from './SeeLatestReleasedButton'
import VersionHistory from './VersionHistory'
import PromoteToProductionButton from './PromoteToProductionButton'
import CollapsibleAdminSection from './CollapsibleAdminSection'
import AdminActions from './AdminActions'
import AdminFileActions from './AdminFileActions'

// Disable static generation, but allow caching with revalidation
export const revalidate = 0

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
    // Check if it's an RLS/access denied error (0 rows returned)
    if (error?.code === 'PGRST116' || (error?.details && error.details.includes('0 rows'))) {
      // Document exists but user doesn't have access (RLS blocked it)
      // This is expected for Draft documents owned by others
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 py-16">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  You don't have permission to view this document. This could be because:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                  <li>The document is in Draft status and you're not the creator</li>
                  <li>The document has been deleted</li>
                  <li>You're not assigned as an approver for this document</li>
                </ul>
                <div className="pt-4">
                  <Link href="/documents">
                    <Button variant="outline">
                      ← Back to Documents
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
    
    // Other error or truly not found
    notFound()
  }

  // Check if current user is the creator
  const isCreator = document.created_by === user.id

  // Get approver count - be explicit about empty array vs null
  const approvers = document.approvers || []
  const approverCount = approvers.length
  const hasApprovers = approverCount > 0

  // Determine button visibility and actions
  const canEdit = (isCreator || isAdmin) && document.status === 'Draft'
  const canDelete = (isCreator || isAdmin) && document.status === 'Draft'
  
  // Determine release/submit logic
  // Release button shows for: Prototype + No Approvers + Draft + Creator
  const canRelease = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' && 
    !document.is_production &&
    !hasApprovers
  
  // Submit button shows for: Draft + Has Approvers + Creator
  // OR: Production + Draft + Creator (always requires approval)
  const canSubmitForApproval = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' &&
    (hasApprovers || document.is_production)

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

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap mb-6">
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

        {/* Create New Version button for Released documents */}
        {document.status === 'Released' && (isCreator || isAdmin) && (
          <CreateNewVersionButton
            documentId={document.id}
            documentNumber={document.document_number}
            version={document.version}
            isProduction={document.is_production}
          />
        )}

        {/* Promote to Production button for Released Prototype documents */}
        {document.status === 'Released' && 
         !document.is_production && 
         (isCreator || isAdmin) && (
          <PromoteToProductionButton
            documentId={document.id}
            documentNumber={document.document_number}
            version={document.version}
          />
        )}

        {canDelete && (
          <DeleteDocumentButton documentId={document.id} />
        )}
      </div>

      {/* Admin Section */}
      {isAdmin && (
  <CollapsibleAdminSection>
    <ChangeOwnerButton 
      documentId={document.id}
      currentOwnerEmail={document.creator?.email || 'Unknown'}
    />
    
    <div className="mt-4">
      <AdminActions
        documentId={document.id}
        documentNumber={`${document.document_number}${document.version}`}
        currentStatus={document.status}
        currentVersion={document.version}
        isProduction={document.is_production}
      />
    </div>
    
    <div className="mt-4">
      <AdminFileActions
        documentId={document.id}
        documentNumber={`${document.document_number}${document.version}`}
        files={document.document_files || []}
      />
    </div>
  </CollapsibleAdminSection>
)}

      {/* See Latest Released Version (for obsolete documents) */}
      {document.status === 'Obsolete' && (
        <div className="mb-6">
          <SeeLatestReleasedButton 
            documentNumber={document.document_number}
            currentVersion={document.version}
          />
        </div>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Information</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Description (full width if exists) */}
          {document.description && (
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-700">{document.description}</p>
            </div>
          )}
          
          {/* Grid layout for compact display */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {/* Left Column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Document Type</p>
                <p className="text-sm text-gray-900">{document.document_type?.name || 'Unknown'}</p>
              </div>
              
              {document.project_code && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Project Code</p>
                  <p className="text-sm font-mono text-gray-900">{document.project_code}</p>
                </div>
              )}
              
              {approverCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Approvers</p>
                  <p className="text-sm text-gray-900">
                    {approverCount} approver{approverCount > 1 ? 's' : ''} assigned
                  </p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(document.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-500">{document.creator?.email?.split('@')[0] || 'Unknown'}</p>
              </div>
              
              {document.released_at && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Released</p>
                  <p className="text-sm text-gray-900">
                    {new Date(document.released_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{document.releaser?.email?.split('@')[0] || 'Unknown'}</p>
                </div>
              )}
            </div>
          </div>
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

      {/* Audit Trail */}
      <div className="mb-6">
        <AuditTrail documentId={document.id} />
      </div>

      {/* Version History */}
      <div className="mb-6">
        <VersionHistory 
          documentNumber={document.document_number}
          currentVersionId={document.id}
        />
      </div>
    </div>
  )
}
