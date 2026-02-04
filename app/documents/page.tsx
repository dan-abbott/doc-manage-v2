import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsSearchPage from './DocumentsSearchPage'
import {
  searchDocuments,
  getUsersForFilters,
  getProjectCodesForFilters,
  getDocumentTypesForFilters
} from '@/app/actions/advanced-search'
import type { AdvancedSearchFilters } from '@/lib/types/advanced-search'

// Disable caching
export const revalidate = 0

interface PageProps {
  searchParams: {
    q?: string
    createdAfter?: string
    createdBefore?: string
    updatedAfter?: string
    updatedBefore?: string
    releasedAfter?: string
    releasedBefore?: string
    types?: string
    statuses?: string
    projects?: string
    createdBy?: string
    releasedBy?: string
    isProduction?: string
    hasAttachments?: string
    myDocs?: string
    page?: string
    sortBy?: string
    sortOrder?: string
  }
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.is_admin || false

  // Parse search params into filters
  const filters: AdvancedSearchFilters = {
    searchQuery: searchParams.q,
    createdAfter: searchParams.createdAfter,
    createdBefore: searchParams.createdBefore,
    updatedAfter: searchParams.updatedAfter,
    updatedBefore: searchParams.updatedBefore,
    releasedAfter: searchParams.releasedAfter,
    releasedBefore: searchParams.releasedBefore,
    documentTypes: searchParams.types ? searchParams.types.split(',') : undefined,
    statuses: searchParams.statuses ? searchParams.statuses.split(',') : ['Draft', 'In Approval', 'Released'],
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

  return (
    <DocumentsSearchPage
      initialFilters={filters}
      initialResults={searchResults}
      documentTypes={documentTypes}
      users={users}
      projectCodes={projectCodes}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  )
}
