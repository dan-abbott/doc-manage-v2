import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { fetchDocumentVersions } from '@/lib/document-helpers'
import DocumentDetailPanel from '../DocumentDetailPanel'
import DocumentActionsPanel from '../DocumentActionsPanel'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: { id: string }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/auth/login')
  }

  const isAdmin = userData?.is_admin || false

  // Fetch the document to get its document_number
  const { data: document } = await supabase
    .from('documents')
    .select('document_number, tenant_id')
    .eq('id', params.id)
    .single()

  if (!document) {
    notFound()
  }

  // Verify tenant access
  if (document.tenant_id !== userData.tenant_id) {
    notFound()
  }

  // Fetch all versions of this document
  const documentData = await fetchDocumentVersions(document.document_number, user.id)

  if (!documentData) {
    notFound()
  }

  // Get available users for approver assignment (if admin or creator)
  const { data: availableUsers } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('tenant_id', userData.tenant_id)
    .eq('is_active', true)
    .order('full_name')

  // Fetch audit logs for ALL versions of this document (cross-version history)
  const { data: auditLogs, error: auditError } = await supabase
    .from('audit_log')
    .select('*')
    .eq('document_number', document.document_number)
    .eq('tenant_id', document.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50)
  
  // Log for debugging
  if (auditError) {
    console.error('Audit log query error:', auditError)
  } else {
    console.log('Audit logs fetched:', {
      documentNumber: document.document_number,
      tenantId: document.tenant_id,
      count: auditLogs?.length || 0
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            asChild
            className="mb-0"
          >
            <Link href="/documents" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Document Details */}
          <div>
            <DocumentDetailPanel
              documentData={documentData}
              availableUsers={availableUsers || []}
              isAdmin={isAdmin}
              currentUserId={user.id}
              currentUserEmail={user.email || ''}
            />
          </div>

          {/* Right: Actions & History */}
          <div>
            <DocumentActionsPanel
              documentData={documentData}
              auditLogs={auditLogs || []}
              isAdmin={isAdmin}
              currentUserId={user.id}
              currentUserEmail={user.email || ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
