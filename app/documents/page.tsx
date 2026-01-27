import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import CollapsibleSearchPanel from './CollapsibleSearchPanel'
import DocumentDetailPanel from './DocumentDetailPanel'
import DocumentActionsPanel from './DocumentActionsPanel'

// Disable caching but allow dynamic rendering
export const revalidate = 0

interface PageProps {
  searchParams: {
    search?: string
    type?: string
    status?: string
    project?: string
    myDocs?: string
    page?: string
    viewAll?: string
    selected?: string
    version?: string
  }
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  console.log('[DocumentsPage] Server rendering with searchParams:', searchParams)
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
 
  if (!user) {
    redirect('/auth/login')
  }

  console.log('[DocumentsPage] User:', user.id, 'Selected:', searchParams.selected)

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.is_admin || false
  const viewAll = searchParams.viewAll === 'true'

  // Get document types for filter
  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Build query
  const page = parseInt(searchParams.page || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('documents')
    .select(`
      *,
      document_type:document_types(name, prefix)
    `, { count: 'exact' })

  // Apply RLS based on admin status and viewAll toggle
  if (!isAdmin || !viewAll) {
    query = query.or(`created_by.eq.${user.id},status.eq.Released,status.eq.Obsolete`)
  }

  // Search filter
  if (searchParams.search) {
    const searchTerm = `%${searchParams.search}%`
    query = query.or(`document_number.ilike.${searchTerm},title.ilike.${searchTerm}`)
  }

  // Type filter
  if (searchParams.type) {
    query = query.eq('document_type_id', searchParams.type)
  }

  // Status filter
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  // Project filter
  if (searchParams.project) {
    query = query.eq('project_code', searchParams.project.toUpperCase())
  }

  // My Documents filter
  if (searchParams.myDocs === 'true') {
    const { data: userDocNumbers } = await supabase
      .from('documents')
      .select('document_number')
      .eq('created_by', user.id)
    
    if (userDocNumbers && userDocNumbers.length > 0) {
      const docNumbers = [...new Set(userDocNumbers.map(d => d.document_number))]
      query = query.in('document_number', docNumbers)
    } else {
      query = query.eq('created_by', user.id)
    }
  }

  // Pagination and sorting
  query = query
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data: documents, error, count } = await query

  if (error) {
    console.error('Error fetching documents:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  // Get selected document versions if document_number provided
  let selectedDocumentData = null
  let auditLogs = []
  let availableUsers = []

  if (searchParams.selected) {
    // Import the helper function dynamically
    const { fetchDocumentVersions } = await import('@/lib/document-helpers')
    selectedDocumentData = await fetchDocumentVersions(searchParams.selected, user.id)
    
    // Fetch audit logs for the primary document
    if (selectedDocumentData?.latestReleased || selectedDocumentData?.wipVersions?.[0]) {
      const { getDocumentAuditLog } = await import('@/app/actions/audit')
      const primaryDoc = selectedDocumentData.latestReleased || selectedDocumentData.wipVersions[0]
      const auditResult = await getDocumentAuditLog(primaryDoc.id)
      if (auditResult.success && auditResult.data) {
        auditLogs = auditResult.data
      }
    }

    // Fetch available users for approver management (exclude current user)
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .neq('id', user.id)
      .eq('tenant_id', user.user_metadata?.tenant_id || 'app')
      .order('email')
    
    availableUsers = users || []
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Collapsible Search/Filter Panel */}
      <CollapsibleSearchPanel
        documentTypes={documentTypes || []}
        documents={documents || []}
        totalCount={count || 0}
        currentFilters={searchParams}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {selectedDocumentData ? (
          <>
            {/* Left: Document Detail with Version Tabs */}
            <div className="w-1/2 overflow-y-auto border-r">
              <DocumentDetailPanel
                documentData={selectedDocumentData}
                selectedVersion={searchParams.version}
                isAdmin={isAdmin}
                currentUserId={user.id}
                currentUserEmail={user.email || ''}
              />
            </div>

            {/* Right: Actions Panel */}
            <div className="w-1/2 overflow-y-auto">
              <DocumentActionsPanel
                documentData={selectedDocumentData}
                auditLogs={auditLogs}
                availableUsers={availableUsers}
                isAdmin={isAdmin}
                currentUserId={user.id}
                currentUserEmail={user.email || ''}
              />
            </div>
          </>
        ) : (
          /* No Document Selected - Show Message */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a document to view details
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Use the search and filters to find documents, then click on one to see its details
              </p>
              <Button asChild>
                <Link href="/documents/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Document
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
