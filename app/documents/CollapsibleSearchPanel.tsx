'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import DocumentsTable from './DocumentsTable'
import { ScanTrigger } from '@/components/ScanTrigger'

interface CollapsibleSearchPanelProps {
  documentTypes: Array<{ id: string; name: string }>
  projectCodes: string[]
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
  projectCodes,
  documents,
  totalCount,
  currentFilters,
  isAdmin 
}: CollapsibleSearchPanelProps) {
  const router = useRouter()
  
  // Panel starts collapsed if document is selected
  const [isOpen, setIsOpen] = useState(!currentFilters.selected)
  const [isMounted, setIsMounted] = useState(false)
  
  // Track when component is mounted
  useEffect(() => {
    console.log('[CollapsibleSearchPanel] Component mounted')
    setIsMounted(true)
  }, [])
  
  // Sync sidebar state when selection changes (only after initial mount)
  // Use a ref to track the last value to prevent unnecessary updates
  const prevSelectedRef = React.useRef(currentFilters.selected)
  const renderCountRef = React.useRef(0)
  
  renderCountRef.current++
  console.log(`[CollapsibleSearchPanel] Render #${renderCountRef.current}`, {
    isMounted,
    currentSelected: currentFilters.selected,
    prevSelected: prevSelectedRef.current,
    isOpen,
    willUpdate: isMounted && prevSelectedRef.current !== currentFilters.selected
  })
  
  useEffect(() => {
    if (isMounted && prevSelectedRef.current !== currentFilters.selected) {
      console.log('[CollapsibleSearchPanel] useEffect triggering state update', {
        from: prevSelectedRef.current,
        to: currentFilters.selected,
        newIsOpen: !currentFilters.selected
      })
      prevSelectedRef.current = currentFilters.selected
      setIsOpen(!currentFilters.selected)
    }
  }, [currentFilters.selected, isMounted])
  
  const [search, setSearch] = useState(currentFilters.search || '')
  const [type, setType] = useState(currentFilters.type || '')
  // Status is now an array - default to exclude Obsolete
  const [status, setStatus] = useState<string[]>(() => {
    if (currentFilters.status) {
      return currentFilters.status.split(',')
    }
    // Default: show Draft, In Approval, and Released (exclude Obsolete)
    return ['Draft', 'In Approval', 'Released']
  })
  const [project, setProject] = useState(currentFilters.project || '')
  const [myDocs, setMyDocs] = useState(currentFilters.myDocs === 'true')

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status.length > 0 && status.length < 4) params.set('status', status.join(','))
    if (project) params.set('project', project)
    if (myDocs) params.set('myDocs', 'true')
    
    // Preserve selected document and admin viewAll
    if (currentFilters.selected) params.set('selected', currentFilters.selected)
    if (currentFilters.viewAll) params.set('viewAll', currentFilters.viewAll)
    
    router.replace(`/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setType('')
    setStatus(['Draft', 'In Approval', 'Released']) // Reset to default
    setProject('')
    setMyDocs(false)
    
    const params = new URLSearchParams()
    // Preserve selected document and admin viewAll
    if (currentFilters.selected) params.set('selected', currentFilters.selected)
    if (currentFilters.viewAll) params.set('viewAll', currentFilters.viewAll)
    
    router.replace(`/documents?${params.toString()}`)
  }

  const hasActiveFilters = search || type || (status.length > 0 && status.length < 4) || project || myDocs

  // Handle status checkbox toggle
  const toggleStatus = (statusValue: string) => {
    setStatus(prev => {
      if (prev.includes(statusValue)) {
        return prev.filter(s => s !== statusValue)
      } else {
        return [...prev, statusValue]
      }
    })
  }

  // Handle document selection - use replace to avoid history spam
  const handleDocumentSelect = (documentNumber: string, version: string) => {
    const params = new URLSearchParams()
    
    // Preserve all current filters
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status.length > 0 && status.length < 4) params.set('status', status.join(','))
    if (project) params.set('project', project)
    if (myDocs) params.set('myDocs', 'true')
    if (currentFilters.viewAll) params.set('viewAll', currentFilters.viewAll)
    
    // Set selected document number and version
    params.set('selected', documentNumber)
    params.set('version', version)
    
    router.replace(`/documents?${params.toString()}`)
    
    // Collapse panel after selection
    setIsOpen(false)
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
    <div className="w-96 lg:w-[40%] xl:w-[35%] 2xl:w-[30%] max-w-2xl bg-white border-r flex flex-col overflow-hidden">
      {/* Header with collapse button */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold">Search & Filter</h2>
            <ScanTrigger />
          </div>
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
      <div className="flex-shrink-0 p-3 space-y-3 border-b">
        {/* Search */}
        <div>
          <Label htmlFor="search" className="text-xs mb-1">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Number or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Document Type and Status - Side by Side */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="type" className="text-xs mb-1">Type</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-8 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="">All types</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <div className="space-y-1">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`status-${option.value}`}
                    checked={status.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                    className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`status-${option.value}`} className="ml-1.5 text-xs text-gray-700 cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Code and My Documents - Side by Side */}
        <div className="grid grid-cols-2 gap-2 items-end">
          <div>
            <Label htmlFor="project" className="text-xs mb-1">Project</Label>
            <select
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="flex h-8 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="">All projects</option>
              {projectCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center pb-0.5">
            <input
              type="checkbox"
              id="myDocs"
              checked={myDocs}
              onChange={(e) => setMyDocs(e.target.checked)}
              className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label htmlFor="myDocs" className="text-xs ml-1.5 cursor-pointer">
              My docs
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 pt-1">
          <Button onClick={applyFilters} className="w-full h-8 text-xs" size="sm">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="w-full h-8 text-xs" size="sm">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Admin View All Toggle */}
        {isAdmin && (
          <div className="pt-2 border-t mt-2 p-2 border border-red-300 rounded bg-red-50">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-xs font-medium text-red-900">Admin View</p>
                <p className="text-xs text-red-700">See all user drafts</p>
              </div>
            </div>
            <Button
              variant={currentFilters.viewAll === 'true' ? 'default' : 'outline'}
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                const params = new URLSearchParams()
                
                // Preserve filters
                if (search) params.set('search', search)
                if (type) params.set('type', type)
                if (status.length > 0 && status.length < 4) params.set('status', status.join(','))
                if (project) params.set('project', project)
                if (myDocs) params.set('myDocs', 'true')
                if (currentFilters.selected) params.set('selected', currentFilters.selected)
                
                // Toggle viewAll
                if (currentFilters.viewAll === 'true') {
                  // Turn off
                  router.replace(`/documents?${params.toString()}`)
                } else {
                  // Turn on
                  params.set('viewAll', 'true')
                  router.replace(`/documents?${params.toString()}`)
                }
              }}
            >
              {currentFilters.viewAll === 'true' ? 'Viewing All Docs' : 'View All Docs'}
            </Button>
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-hidden border-t">
        <div className="h-full overflow-y-auto">
          <DocumentsTable 
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentNumber={currentFilters.selected}
          />
        </div>
      </div>
    </div>
  )
}
