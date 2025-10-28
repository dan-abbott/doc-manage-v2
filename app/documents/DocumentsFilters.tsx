'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface DocumentsFiltersProps {
  documentTypes: Array<{ id: string; name: string }>
  currentFilters: {
    search?: string
    type?: string
    status?: string
    project?: string
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
    
    router.push(`/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setType('')
    setStatus('')
    setProject('')
    router.push('/documents')
  }

  const hasActiveFilters = search || type || status || project

  return (
    <div className="space-y-4">
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
        {/* Document Type */}
        <div>
          <Label htmlFor="type">Document Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
          </Select>
        </div>

        {/* Project Code */}
        <div>
          <Label htmlFor="project">Project Code</Label>
          <Input
            id="project"
            placeholder="P-12345"
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
