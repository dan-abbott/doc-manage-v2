/**
 * Advanced Search Types
 * lib/types/advanced-search.ts
 */

export interface AdvancedSearchFilters {
  // Text search
  searchQuery?: string
  
  // Date ranges (ISO date strings)
  createdAfter?: string
  createdBefore?: string
  updatedAfter?: string
  updatedBefore?: string
  releasedAfter?: string
  releasedBefore?: string
  
  // Multi-select filters
  documentTypes?: string[]      // Array of document_type_id UUIDs
  statuses?: string[]            // Array of: Draft, In Approval, Released, Obsolete
  projectCodes?: string[]        // Array of project codes
  
  // Single-select filters
  createdBy?: string             // user_id UUID
  releasedBy?: string            // user_id UUID
  
  // Boolean filters
  isProduction?: boolean | null  // null=both, true=production, false=prototype
  hasAttachments?: boolean | null // null=both, true=yes, false=no
  myDocumentsOnly?: boolean
  
  // Pagination & sorting
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'updated_at' | 'released_at' | 'document_number' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  documents: any[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface QuickFilter {
  label: string
  filters: Partial<AdvancedSearchFilters>
  icon?: string
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    label: 'Last 7 Days',
    filters: {
      updatedAfter: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } as any,
    icon: '📅'
  },
  {
    label: 'Last 30 Days',
    filters: {
      updatedAfter: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    } as any,
    icon: '📆'
  },
  {
    label: 'My Drafts',
    filters: {
      myDocumentsOnly: true,
      statuses: ['Draft']
    },
    icon: '✏️'
  },
  {
    label: 'Pending Approval',
    filters: {
      statuses: ['In Approval']
    },
    icon: '⏳'
  },
  {
    label: 'Recently Released',
    filters: {
      statuses: ['Released'],
      releasedAfter: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    } as any,
    icon: '🎉'
  }
]

// Helper to evaluate quick filter functions
export function getQuickFilterValues(filter: QuickFilter): Partial<AdvancedSearchFilters> {
  const result: any = {}
  
  for (const [key, value] of Object.entries(filter.filters)) {
    result[key] = typeof value === 'function' ? value() : value
  }
  
  return result
}
