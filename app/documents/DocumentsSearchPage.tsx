'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AdvancedFilters from './AdvancedFilters'
import { searchDocuments } from '@/app/actions/advanced-search'
import type { AdvancedSearchFilters, SearchResult } from '@/lib/types/advanced-search'

interface Props {
  initialFilters: AdvancedSearchFilters
  initialResults: SearchResult
  documentTypes: Array<{ id: string; name: string; prefix: string }>
  users: Array<{ id: string; email: string; full_name: string | null }>
  projectCodes: string[]
  isAdmin: boolean
  currentUserId: string
}

export default function DocumentsSearchPage({
  initialFilters,
  initialResults,
  documentTypes,
  users,
  projectCodes,
  isAdmin,
  currentUserId
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [results, setResults] = useState(initialResults)
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters)

  const handleFiltersChange = async (newFilters: AdvancedSearchFilters) => {
    setFilters(newFilters)

    // Build URL params
    const params = new URLSearchParams()
    
    if (newFilters.searchQuery) params.set('q', newFilters.searchQuery)
    if (newFilters.createdAfter) params.set('createdAfter', newFilters.createdAfter)
    if (newFilters.createdBefore) params.set('createdBefore', newFilters.createdBefore)
    if (newFilters.updatedAfter) params.set('updatedAfter', newFilters.updatedAfter)
    if (newFilters.updatedBefore) params.set('updatedBefore', newFilters.updatedBefore)
    if (newFilters.releasedAfter) params.set('releasedAfter', newFilters.releasedAfter)
    if (newFilters.releasedBefore) params.set('releasedBefore', newFilters.releasedBefore)
    
    if (newFilters.documentTypes && newFilters.documentTypes.length > 0) {
      params.set('types', newFilters.documentTypes.join(','))
    }
    if (newFilters.statuses && newFilters.statuses.length > 0) {
      params.set('statuses', newFilters.statuses.join(','))
    }
    if (newFilters.projectCodes && newFilters.projectCodes.length > 0) {
      params.set('projects', newFilters.projectCodes.join(','))
    }
    
    if (newFilters.createdBy) params.set('createdBy', newFilters.createdBy)
    if (newFilters.releasedBy) params.set('releasedBy', newFilters.releasedBy)
    if (newFilters.isProduction !== null) params.set('isProduction', String(newFilters.isProduction))
    if (newFilters.hasAttachments !== null) params.set('hasAttachments', String(newFilters.hasAttachments))
    if (newFilters.myDocumentsOnly) params.set('myDocs', 'true')
    
    if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page))
    if (newFilters.sortBy && newFilters.sortBy !== 'updated_at') params.set('sortBy', newFilters.sortBy)
    if (newFilters.sortOrder && newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder)
    
    // Update URL
    router.push(`/documents?${params.toString()}`, { scroll: false })

    // Fetch new results with proper transition
    try {
      startTransition(() => {
        searchDocuments(newFilters).then(newResults => {
          setResults(newResults)
        }).catch(error => {
          console.error('Search error:', error)
          // Keep showing old results on error
        })
      })
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  const handleDocumentClick = (documentId: string) => {
    router.push(`/documents/${documentId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">
              {results.totalCount} document{results.totalCount !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button asChild>
            <Link href="/documents/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Document
            </Link>
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <AdvancedFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            documentTypes={documentTypes}
            users={users}
            projectCodes={projectCodes}
          />
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg border shadow-sm">
          {isPending ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="text-sm text-gray-600 mt-4">Searching...</p>
            </div>
          ) : results.documents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-sm text-gray-600">Try adjusting your search filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.documents.map((doc: any) => (
                      <tr
                        key={doc.id}
                        onClick={() => handleDocumentClick(doc.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {doc.document_number}{doc.version}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {doc.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {doc.document_type?.prefix}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            inline-flex px-2 py-1 text-xs font-semibold rounded-full
                            ${doc.status === 'Draft' ? 'bg-gray-100 text-gray-700' : ''}
                            ${doc.status === 'In Approval' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${doc.status === 'Released' ? 'bg-green-100 text-green-700' : ''}
                            ${doc.status === 'Obsolete' ? 'bg-gray-200 text-gray-600' : ''}
                          `}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.project_code || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {results.totalPages > 1 && (
                <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((filters.page || 1) - 1) * (filters.pageSize || 50) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min((filters.page || 1) * (filters.pageSize || 50), results.totalCount)}</span> of{' '}
                    <span className="font-medium">{results.totalCount}</span> results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleFiltersChange({ ...filters, page: (filters.page || 1) - 1 })}
                      disabled={filters.page === 1 || isPending}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-gray-700">
                      Page {results.page} of {results.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handleFiltersChange({ ...filters, page: (filters.page || 1) + 1 })}
                      disabled={!results.hasMore || isPending}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
