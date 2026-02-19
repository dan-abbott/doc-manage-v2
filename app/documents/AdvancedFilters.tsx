/**
 * Advanced Filters Component
 * app/documents/AdvancedFilters.tsx
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import type { AdvancedSearchFilters } from '@/lib/types/advanced-search'
import { QUICK_FILTERS } from '@/lib/types/advanced-search'
import Autocomplete from './Autocomplete'

interface Props {
  filters: AdvancedSearchFilters
  onFiltersChange: (filters: AdvancedSearchFilters) => void
  documentTypes: Array<{ id: string; name: string; prefix: string }>
  users: Array<{ id: string; email: string; full_name: string | null }>
  projectCodes: string[]
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  documentTypes,
  users,
  projectCodes
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleQuickFilter = (index: number) => {
    const quickFilter = QUICK_FILTERS[index]
    const filterValues = quickFilter.getFilters()
    onFiltersChange({ ...filters, ...filterValues, page: 1 })
  }

  const handleClearAll = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    })
  }

  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    filters.createdAfter ||
    filters.createdBefore ||
    filters.updatedAfter ||
    filters.updatedBefore ||
    filters.releasedAfter ||
    filters.releasedBefore ||
    (filters.documentTypes && filters.documentTypes.length > 0) ||
    (filters.statuses && filters.statuses.length > 0) ||
    (filters.projectCodes && filters.projectCodes.length > 0) ||
    filters.createdBy ||
    filters.releasedBy ||
    filters.isProduction !== null ||
    filters.hasAttachments !== null ||
    filters.myDocumentsOnly
  )

  return (
    <div className="space-y-4">
      {/* Search Bar & Advanced Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by document number or title..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value, page: 1 })}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="whitespace-nowrap"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
          Advanced Filters
          {hasActiveFilters && !isExpanded && (
            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((qf, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(index)}
            className="text-sm"
          >
            {qf.icon && <span className="mr-1">{qf.icon}</span>}
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Ranges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Created Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Created Date (between)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={filters.createdAfter?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      createdAfter: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={filters.createdBefore?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      createdBefore: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Updated Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Updated Date (between)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={filters.updatedAfter?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      updatedAfter: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={filters.updatedBefore?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      updatedBefore: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Released Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Released Date (between)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={filters.releasedAfter?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      releasedAfter: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={filters.releasedBefore?.split('T')[0] || ''}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      releasedBefore: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined,
                      page: 1
                    })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Multi-Select Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Document Type</Label>
                <select
                  multiple
                  value={filters.documentTypes || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    onFiltersChange({ ...filters, documentTypes: selected, page: 1 })
                  }}
                  className="w-full border rounded-md p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {documentTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.prefix} - {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <select
                  multiple
                  value={filters.statuses || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    onFiltersChange({ ...filters, statuses: selected, page: 1 })
                  }}
                  className="w-full border rounded-md p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Approval">In Approval</option>
                  <option value="Released">Released</option>
                  <option value="Obsolete">Obsolete</option>
                </select>
                <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>

            {/* User Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Created By</Label>
                <Autocomplete
                  value={filters.createdBy || ''}
                  onChange={(value) => onFiltersChange({
                    ...filters,
                    createdBy: value || undefined,
                    page: 1
                  })}
                  options={[
                    { value: '', label: 'All Users' },
                    ...users.map(user => ({
                      value: user.id,
                      label: user.full_name || user.email
                    }))
                  ]}
                  placeholder="Search users..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Released By</Label>
                <Autocomplete
                  value={filters.releasedBy || ''}
                  onChange={(value) => onFiltersChange({
                    ...filters,
                    releasedBy: value || undefined,
                    page: 1
                  })}
                  options={[
                    { value: '', label: 'All Users' },
                    ...users.map(user => ({
                      value: user.id,
                      label: user.full_name || user.email
                    }))
                  ]}
                  placeholder="Search users..."
                />
              </div>
            </div>

            {/* Boolean Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Document Class</Label>
                <select
                  value={filters.isProduction === null ? '' : String(filters.isProduction)}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    isProduction: e.target.value === '' ? null : e.target.value === 'true',
                    page: 1
                  })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Both</option>
                  <option value="false">Prototype</option>
                  <option value="true">Production</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Has Attachments</Label>
                <select
                  value={filters.hasAttachments === null ? '' : String(filters.hasAttachments)}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    hasAttachments: e.target.value === '' ? null : e.target.value === 'true',
                    page: 1
                  })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Both</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Scope</Label>
                <select
                  value={String(filters.myDocumentsOnly || false)}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    myDocumentsOnly: e.target.value === 'true',
                    page: 1
                  })}
                  className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="false">All Documents</option>
                  <option value="true">My Documents Only</option>
                </select>
              </div>
            </div>

            {/* Project Code Filter (if project codes exist) */}
            {projectCodes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Project Code</Label>
                <Autocomplete
                  value={filters.projectCodes?.[0] || ''}
                  onChange={(value) => onFiltersChange({
                    ...filters,
                    projectCodes: value ? [value] : undefined,
                    page: 1
                  })}
                  options={[
                    { value: '', label: 'All Projects' },
                    ...projectCodes.map(code => ({
                      value: code,
                      label: code
                    }))
                  ]}
                  placeholder="Search projects..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
