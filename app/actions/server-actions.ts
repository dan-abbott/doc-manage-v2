/**
 * Advanced Search Server Actions
 * app/actions/advanced-search.ts
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import type { AdvancedSearchFilters, SearchResult } from '@/lib/types/advanced-search'

/**
 * Main advanced search function
 * Builds dynamic query based on filters and returns paginated results
 */
export async function searchDocuments(
  filters: AdvancedSearchFilters
): Promise<SearchResult> {
  const supabase = await createClient()

  // Get current user and tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User has no tenant')
  }

  const tenantId = userData.tenant_id

  // Build base query with joins for related data
  let query = supabase
    .from('documents')
    .select(`
      id,
      document_number,
      version,
      title,
      description,
      status,
      is_production,
      project_code,
      created_at,
      updated_at,
      released_at,
      created_by,
      released_by,
      document_type:document_types!inner(id, name, prefix),
      created_by_user:users!documents_created_by_fkey(email, full_name),
      released_by_user:users!documents_released_by_fkey(email, full_name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)

  // Text search - search in document_number and title
  if (filters.searchQuery?.trim()) {
    const searchTerm = `%${filters.searchQuery.trim()}%`
    query = query.or(`document_number.ilike.${searchTerm},title.ilike.${searchTerm}`)
  }

  // Date range filters
  if (filters.createdAfter) {
    query = query.gte('created_at', filters.createdAfter)
  }
  if (filters.createdBefore) {
    // Add end of day
    const endOfDay = new Date(filters.createdBefore)
    endOfDay.setHours(23, 59, 59, 999)
    query = query.lte('created_at', endOfDay.toISOString())
  }
  
  if (filters.updatedAfter) {
    query = query.gte('updated_at', filters.updatedAfter)
  }
  if (filters.updatedBefore) {
    const endOfDay = new Date(filters.updatedBefore)
    endOfDay.setHours(23, 59, 59, 999)
    query = query.lte('updated_at', endOfDay.toISOString())
  }
  
  if (filters.releasedAfter) {
    query = query.gte('released_at', filters.releasedAfter)
  }
  if (filters.releasedBefore) {
    const endOfDay = new Date(filters.releasedBefore)
    endOfDay.setHours(23, 59, 59, 999)
    query = query.lte('released_at', endOfDay.toISOString())
  }

  // Multi-select filters
  if (filters.documentTypes && filters.documentTypes.length > 0) {
    query = query.in('document_type_id', filters.documentTypes)
  }
  
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  }
  
  if (filters.projectCodes && filters.projectCodes.length > 0) {
    query = query.in('project_code', filters.projectCodes)
  }

  // User filters
  if (filters.createdBy) {
    query = query.eq('created_by', filters.createdBy)
  }
  
  if (filters.releasedBy) {
    query = query.eq('released_by', filters.releasedBy)
  }

  // Production/Prototype filter
  if (filters.isProduction !== null && filters.isProduction !== undefined) {
    query = query.eq('is_production', filters.isProduction)
  }

  // My Documents filter
  if (filters.myDocumentsOnly) {
    query = query.eq('created_by', user.id)
  }

  // Sorting
  const sortBy = filters.sortBy || 'updated_at'
  const sortOrder = filters.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Pagination
  const page = filters.page || 1
  const pageSize = filters.pageSize || 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to)

  // Execute query
  const { data: documents, error, count } = await query

  if (error) {
    console.error('[Advanced Search] Query error:', error)
    throw new Error(`Search failed: ${error.message}`)
  }

  let filteredDocuments = documents || []

  // Post-process: Filter by hasAttachments (can't do efficiently in query)
  if (filters.hasAttachments !== null && filters.hasAttachments !== undefined) {
    const documentIds = filteredDocuments.map(d => d.id)
    
    if (documentIds.length > 0) {
      const { data: fileCounts } = await supabase
        .from('document_files')
        .select('document_id')
        .in('document_id', documentIds)

      const docsWithFiles = new Set(fileCounts?.map(f => f.document_id) || [])

      filteredDocuments = filteredDocuments.filter(doc => {
        const hasFiles = docsWithFiles.has(doc.id)
        return filters.hasAttachments ? hasFiles : !hasFiles
      })
    } else if (filters.hasAttachments === false) {
      // No documents returned but user wants docs without files - that's fine
    } else {
      // No documents and user wants docs with files - return empty
      filteredDocuments = []
    }
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    documents: filteredDocuments,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages
  }
}

/**
 * Get all users for filter dropdown
 */
export async function getUsersForFilters() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return []

  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('tenant_id', userData.tenant_id)
    .order('full_name', { ascending: true, nullsFirst: false })

  return users || []
}

/**
 * Get all unique project codes for filter dropdown
 */
export async function getProjectCodesForFilters() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return []

  const { data: documents } = await supabase
    .from('documents')
    .select('project_code')
    .eq('tenant_id', userData.tenant_id)
    .not('project_code', 'is', null)
    .order('project_code')

  // Get unique, sorted project codes
  const uniqueCodes = [...new Set(
    documents?.map(d => d.project_code).filter(Boolean) || []
  )].sort()
  
  return uniqueCodes as string[]
}

/**
 * Get all active document types for filter dropdown
 */
export async function getDocumentTypesForFilters() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return []

  const { data: types } = await supabase
    .from('document_types')
    .select('id, name, prefix')
    .eq('tenant_id', userData.tenant_id)
    .eq('is_active', true)
    .order('prefix')

  return types || []
}
