'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Dynamically import VersionHistory to prevent hydration issues
const VersionHistory = dynamic(() => import('./[id]/VersionHistory'), { 
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">Loading version history...</p>
      </CardContent>
    </Card>
  )
})

interface DocumentDetailPanelProps {
  document: any
  files: any[]
  approvers: any[]
  isCreator: boolean
  isAdmin: boolean
  currentUserId: string
  currentUserEmail: string
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  'Released': 'bg-green-500',
  'Obsolete': 'bg-gray-700',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DocumentDetailPanel({
  document,
  files,
  approvers,
  isCreator,
  isAdmin,
  currentUserId,
  currentUserEmail
}: DocumentDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'released' | 'wip'>('released')

  return (
    <div className="p-6">
      {/* Document Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">
            {document.document_number}{document.version}
          </h1>
          <Badge className={STATUS_COLORS[document.status]}>
            {document.status}
          </Badge>
          {document.is_production && (
            <Badge variant="outline">Production</Badge>
          )}
        </div>
        <p className="text-lg text-gray-600">{document.title}</p>
      </div>

      {/* Tabs for Released vs WIP */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('released')}
            className={cn(
              "pb-2 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'released' 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Released Versions
          </button>
          <button
            onClick={() => setActiveTab('wip')}
            className={cn(
              "pb-2 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'wip' 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Work In Progress
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'released' ? (
        <div className="space-y-6">
          {/* Document Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              {document.description && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-700">{document.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Document Type</p>
                    <p className="text-sm text-gray-900">{document.document_type?.name || 'Unknown'}</p>
                  </div>
                  
                  {document.project_code && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Project Code</p>
                      <p className="text-sm font-mono text-gray-900">{document.project_code}</p>
                    </div>
                  )}
                  
                  {approvers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Approvers</p>
                      <p className="text-sm text-gray-900">
                        {approvers.length} approver{approvers.length > 1 ? 's' : ''} assigned
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Created</p>
                    <p className="text-sm text-gray-900" suppressHydrationWarning>
                      {formatDate(document.created_at)}
                    </p>
                    <p className="text-xs text-gray-500">{document.creator?.email?.split('@')[0] || 'Unknown'}</p>
                  </div>
                  
                  {document.released_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Released</p>
                      <p className="text-sm text-gray-900" suppressHydrationWarning>
                        {formatDate(document.released_at)}
                      </p>
                      <p className="text-xs text-gray-500">{document.releaser?.email?.split('@')[0] || 'Unknown'}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attached Files */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attached Files</CardTitle>
            </CardHeader>
            <CardContent>
              {files && files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.original_file_name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={`/api/documents/${document.id}/files/${file.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No files attached</p>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <VersionHistory 
            documentNumber={document.document_number}
            currentVersionId={document.id}
          />
        </div>
      ) : (
        /* WIP Tab */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                This tab will show Draft and In Approval versions once implemented.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
