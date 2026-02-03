/**
 * Documents Page Client Component
 * app/documents/DocumentsPageClient.tsx
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AdvancedFilters from './AdvancedFilters'
import DocumentDetailPanel from './DocumentDetailPanel'
import DocumentActionsPanel from './DocumentActionsPanel'
import { searchDocuments } from '@/app/actions/advanced-search'
import type { AdvancedSearchFilters, SearchResult } from '@/lib/types/advanced-search'

interface Props {
  initialFilters: AdvancedSearchFilters
  initialResults: SearchResult
  documentTypes: Array<{ id: string; name: string; prefix: string }>
  users: Array<{ id: string; email: string; full_name: string | null }>
  projectCodes: string[]
  selectedDocument?: string
  selectedVersion?: string
  selectedDocumentData: any
  auditLogs: any[]
  availableUsers: any[]
  isAdmin: boolean
  currentUserId: string
  currentUserEmail: string
}

export default function DocumentsPageClient({
  initialFilters,
  initialResults,
  documentTypes,
  users,
  projectCodes,
  selectedDocument,
  selectedVersion,
  selectedDocumentData,
  auditLogs,
  availableUsers,
  isAdmin,
  currentUserId,
  currentUserEmail
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [results, setResults] = useState(initialResults)
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters)
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState(false)

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
    
    // Preserve selected document
    if (selectedDocument) {
      params.set('selected', selectedDocument)
      if (selectedVersion) params.set('version', selectedVersion)
    }
    
    router.push(`/documents?${params.toString()}`, { scroll: false })

    // Fetch new results
    startTransition(async () => {
      const newResults = await searchDocuments(newFilters)
      setResults(newResults)
    })
  }

  const handleDocumentClick = (documentNumber: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('selected', documentNumber)
    params.delete('version') // Reset version when selecting new document
    router.push(`/documents?${params.toString()}`)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Collapsible Search/Filter Panel */}
      <div 
        className={`
          border-r bg-white transition-all duration-300 ease-in-out
          ${isSearchPanelCollapsed ? 'w-0' : 'w-80'}
          overflow-hidden
        `}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold">Documents</h2>
              <p className="text-sm text-gray-600">
                {results.totalCount} document{results.totalCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchPanelCollapsed(true)}
              className="h-8 w-8 p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </Button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b flex-shrink-0 overflow-y-auto max-h-96">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              documentTypes={documentTypes}
              users={users}
              projectCodes={projectCodes}
            />
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto">
            {isPending ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-sm text-gray-600 mt-2">Searching...</p>
              </div>
            ) : results.documents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 mb-2">No documents found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y">
                {results.documents.map((doc: any) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc.document_number)}
                    className={`
                      w-full p-4 text-left hover:bg-gray-50 transition-colors
                      ${selectedDocument === doc.document_number ? 'bg-blue-50 border-l-4 border-blue-600' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-sm font-semibold">
                        {doc.document_number}{doc.version}
                      </span>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${doc.status === 'Draft' ? 'bg-gray-100 text-gray-700' : ''}
                        ${doc.status === 'In Approval' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${doc.status === 'Released' ? 'bg-green-100 text-green-700' : ''}
                        ${doc.status === 'Obsolete' ? 'bg-gray-200 text-gray-600' : ''}
                      `}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{doc.document_type?.prefix}</span>
                      <span>•</span>
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {results.totalPages > 1 && (
              <div className="p-4 border-t bg-white">
                <div className="flex justify-between items-center text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFiltersChange({ ...filters, page: filters.page! - 1 })}
                    disabled={filters.page === 1 || isPending}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-600">
                    Page {results.page} of {results.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFiltersChange({ ...filters, page: filters.page! + 1 })}
                    disabled={!results.hasMore || isPending}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* New Document Button */}
          <div className="p-4 border-t flex-shrink-0">
            <Button asChild className="w-full">
              <Link href="/documents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Document
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Collapse button (when panel is collapsed) */}
      {isSearchPanelCollapsed && (
        <button
          onClick={() => setIsSearchPanelCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border-r border-t border-b rounded-r-lg p-2 hover:bg-gray-50 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {selectedDocumentData ? (
          <>
            {/* Left: Document Detail with Version Tabs */}
            <div className="w-1/2 overflow-y-auto border-r">
              <DocumentDetailPanel
                documentData={selectedDocumentData}
                selectedVersion={selectedVersion}
                availableUsers={availableUsers}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                currentUserEmail={currentUserEmail}
              />
            </div>

            {/* Right: Actions Panel */}
            <div className="w-1/2 overflow-y-auto">
              <DocumentActionsPanel
                documentData={selectedDocumentData}
                auditLogs={auditLogs}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                currentUserEmail={currentUserEmail}
              />
            </div>
          </>
        ) : (
          /* No Document Selected - Show Message */}
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
