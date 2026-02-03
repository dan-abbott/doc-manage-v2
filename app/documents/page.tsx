import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsPageClient from './DocumentsPageClient'
import { 
  searchDocuments, 
  getUsersForFilters, 
  getProjectCodesForFilters, 
  getDocumentTypesForFilters 
} from '@/app/actions/advanced-search'
import type { AdvancedSearchFilters } from '@/lib/types/advanced-search'

// Disable caching but allow dynamic rendering
export const revalidate = 0

interface PageProps {
  searchParams: {
    // Advanced search params
    q?: string
    createdAfter?: string
    createdBefore?: string
    updatedAfter?: string
    updatedBefore?: string
    releasedAfter?: string
    releasedBefore?: string
    types?: string  // comma-separated IDs
    statuses?: string  // comma-separated statuses
    projects?: string  // comma-separated project codes
    createdBy?: string
    releasedBy?: string
    isProduction?: string
    hasAttachments?: string
    myDocs?: string
    page?: string
    sortBy?: string
    sortOrder?: string
    
    // Document selection (keep existing)
    selected?: string
    version?: string
    viewAll?: string
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

  console.log('[DocumentsPage] User:', user.id)

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.is_admin || false

  // Parse search params into AdvancedSearchFilters
  const filters: AdvancedSearchFilters = {
    searchQuery: searchParams.q,
    createdAfter: searchParams.createdAfter,
    createdBefore: searchParams.createdBefore,
    updatedAfter: searchParams.updatedAfter,
    updatedBefore: searchParams.updatedBefore,
    releasedAfter: searchParams.releasedAfter,
    releasedBefore: searchParams.releasedBefore,
    documentTypes: searchParams.types ? searchParams.types.split(',') : undefined,
    statuses: searchParams.statuses ? searchParams.statuses.split(',') : ['Draft', 'In Approval', 'Released'], // Default: exclude Obsolete
    projectCodes: searchParams.projects ? searchParams.projects.split(',') : undefined,
    createdBy: searchParams.createdBy,
    releasedBy: searchParams.releasedBy,
    isProduction: searchParams.isProduction ? searchParams.isProduction === 'true' : null,
    hasAttachments: searchParams.hasAttachments ? searchParams.hasAttachments === 'true' : null,
    myDocumentsOnly: searchParams.myDocs === 'true',
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    pageSize: 50,
    sortBy: (searchParams.sortBy as any) || 'updated_at',
    sortOrder: (searchParams.sortOrder as any) || 'desc'
  }

  // Fetch data in parallel
  const [searchResults, users, projectCodes, documentTypes] = await Promise.all([
    searchDocuments(filters),
    getUsersForFilters(),
    getProjectCodesForFilters(),
    getDocumentTypesForFilters()
  ])

  // Get selected document versions if document_number provided
  let selectedDocumentData = null
  let auditLogs = []
  let availableUsers: any[] = []

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
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, full_name')
      .neq('id', user.id)
      .order('email')
    
    availableUsers = usersData || []
  }

  return (
    <DocumentsPageClient
      initialFilters={filters}
      initialResults={searchResults}
      documentTypes={documentTypes}
      users={users}
      projectCodes={projectCodes}
      selectedDocument={searchParams.selected}
      selectedVersion={searchParams.version}
      selectedDocumentData={selectedDocumentData}
      auditLogs={auditLogs}
      availableUsers={availableUsers}
      isAdmin={isAdmin}
      currentUserId={user.id}
      currentUserEmail={user.email || ''}
    />
  )
}
