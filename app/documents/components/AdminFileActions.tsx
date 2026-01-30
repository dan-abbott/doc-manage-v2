'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface AdminFileActionsProps {
  documentId: string
  documentNumber: string
  files: Array<{
    id: string
    original_file_name: string
    file_size: number
  }>
}

export default function AdminFileActions({
  documentId,
  documentNumber,
  files,
}: AdminFileActionsProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentId', documentId)

      const response = await fetch('/api/admin/upload-file', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`File uploaded: ${file.name}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      const response = await fetch('/api/admin/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileToDelete,
          documentId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('File deleted')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete file')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setShowDeleteConfirm(false)
      setFileToDelete(null)
    }
  }

  const confirmDeleteFile = (fileId: string) => {
    setFileToDelete(fileId)
    setShowDeleteConfirm(true)
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-900">
            <Upload className="h-4 w-4" />
            Admin File Management
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="h-3 w-3" />
            <span>Can add/remove files regardless of document status</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload New File */}
          <div className="space-y-2">
            <label htmlFor="admin-file-upload" className="block">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isUploading}
                className="w-full"
                onClick={() => document.getElementById('admin-file-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Add File (Admin)'}
              </Button>
            </label>
            <input
              id="admin-file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500">
              Files can be added even if document is Released or In Approval
            </p>
          </div>

          {/* Current Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Current Files:</p>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="pt-2 border-t border-red-200">
            <p className="text-xs text-gray-600">
              <strong>Document:</strong> {documentNumber}
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteFile}
        title="Delete File?"
        description="Are you sure you want to delete this file? This action will be logged in the audit trail."
        confirmText="Delete File"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}
