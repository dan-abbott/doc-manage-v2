'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface DocumentsFiltersProps {
  documentTypes: Array<{ id: string; name: string }>
  currentFilters: {
    search?: string
    type?: string
    status?: string
    project?: string
    filter?: string
  }
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'In Approval', label: 'In Approval' },
  { value: 'Released', label: 'Released' },
  { value: 'Obsolete', label: 'Obsolete' },
]

export default function DocumentsFilters({ 
  documentTypes, 
  currentFilters 
}: DocumentsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(currentFilters.search || '')
  const [type, setType] = useState(currentFilters.type || '')
  const [status, setStatus] = useState(currentFilters.status || '')
  const [project, setProject] = useState(currentFilters.project || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    if (project) params.set('project', project)
    
    // Preserve the "my documents" filter if active
    if (currentFilters.filter) params.set('filter', currentFilters.filter)
    
    router.push(`/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setType('')
    setStatus('')
    setProject('')
    router.push('/documents')
  }

  const hasActiveFilters = search || type || status || project || currentFilters.filter

  return (
    <div className="space-y-4">
      {/* Active My Documents Filter Indicator */}
      {currentFilters.filter === 'my' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-sm text-purple-800">
            <strong>My Documents:</strong> Showing documents you created or revised
          </p>
        </div>
      )}
      
      {/* Search */}
      <div>
        <Label htmlFor="search">Search</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Document number or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Document Type - Native Select */}
        <div>
          <Label htmlFor="type">Document Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All types</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status - Native Select */}
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          <Label htmlFor="project">Project Code</Label>
          <Input
            id="project"
            placeholder="Project Identifier (e.g. PROJ123)"
            value={project}
            onChange={(e) => setProject(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            maxLength={7}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={applyFilters}>
          <Search className="mr-2 h-4 w-4" />
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
