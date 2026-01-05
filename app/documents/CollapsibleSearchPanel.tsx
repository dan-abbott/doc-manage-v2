'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import DocumentsTable from './DocumentsTable'

interface CollapsibleSearchPanelProps {
  documentTypes: Array<{ id: string; name: string }>
  documents: any[]
  totalCount: number
  currentFilters: {
    search?: string
    type?: string
    status?: string
    project?: string
    myDocs?: string
    page?: string
    viewAll?: string
    selected?: string
  }
  isAdmin: boolean
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'In Approval', label: 'In Approval' },
  { value: 'Released', label: 'Released' },
  { value: 'Obsolete', label: 'Obsolete' },
]

export default function CollapsibleSearchPanel({ 
  documentTypes, 
  documents,
  totalCount,
  currentFilters,
  isAdmin 
}: CollapsibleSearchPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Panel is open by default if no document is selected
  const [isOpen, setIsOpen] = useState(!currentFilters.selected)
  
  const [search, setSearch] = useState(currentFilters.search || '')
  const [type, setType] = useState(currentFilters.type || '')
  const [status, setStatus] = useState(currentFilters.status || '')
  const [project, setProject] = useState(currentFilters.project || '')
  const [myDocs, setMyDocs] = useState(currentFilters.myDocs === 'true')

  // Auto-collapse when document is selected
  useEffect(() => {
    if (currentFilters.selected && isOpen) {
      setIsOpen(false)
    }
  }, [currentFilters.selected])

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    if (project) params.set('project', project)
    if (myDocs) params.set('myDocs', 'true')
    
    // Preserve selected document and admin viewAll
    if (currentFilters.selected) params.set('selected', currentFilters.selected)
    if (currentFilters.viewAll) params.set('viewAll', currentFilters.viewAll)
    
    router.push(`/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setType('')
    setStatus('')
    setProject('')
    setMyDocs(false)
    
    const params = new URLSearchParams()
    // Preserve selected document and admin viewAll
    if (currentFilters.selected) params.set('selected', currentFilters.selected)
    if (currentFilters.viewAll) params.set('viewAll', currentFilters.viewAll)
    
    router.push(`/documents?${params.toString()}`)
  }

  const hasActiveFilters = search || type || status || project || myDocs

  // Handle document selection
  const handleDocumentSelect = (docId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', docId)
    router.push(`/documents?${params.toString()}`)
  }

  if (!isOpen) {
    return (
      <div className="w-8 bg-gray-100 border-r flex items-center justify-center hover:bg-gray-200 transition-colors">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-300 rounded"
          aria-label="Open search panel"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
      {/* Header with collapse button */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Search & Filter</h2>
          <p className="text-xs text-gray-500">{totalCount} document{totalCount === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className={cn(
            "p-1 hover:bg-gray-100 rounded",
            !currentFilters.selected && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Collapse panel"
          disabled={!currentFilters.selected}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 p-4 space-y-4 border-b">
        {/* My Documents Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="myDocs"
            checked={myDocs}
            onChange={(e) => setMyDocs(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <Label htmlFor="myDocs" className="text-sm font-medium cursor-pointer">
            Only show my documents
          </Label>
        </div>

        {/* Active Filter Indicator */}
        {myDocs && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
            <p className="text-xs text-purple-800">
              Showing documents you created or revised
            </p>
          </div>
        )}

        {/* Search */}
        <div>
          <Label htmlFor="search" className="text-sm">Search</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Number or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Document Type */}
        <div>
          <Label htmlFor="type" className="text-sm">Document Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="">All types</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status" className="text-sm">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Project Code */}
        <div>
          <Label htmlFor="project" className="text-sm">Project Code</Label>
          <Input
            id="project"
            placeholder="P-12345"
            value={project}
            onChange={(e) => setProject(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            maxLength={7}
            className="mt-1 h-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={applyFilters} className="w-full h-9" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="w-full h-9" size="sm">
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-hidden border-t">
        <div className="h-full overflow-y-auto">
          <DocumentsTable 
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            selectedId={currentFilters.selected}
          />
        </div>
      </div>
    </div>
  )
}
