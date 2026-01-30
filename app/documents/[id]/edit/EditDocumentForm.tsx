'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/documents/FileUpload'
import { ScanStatusBadge } from '@/components/ScanStatusBadge'
import { toast } from 'sonner'
import { updateDocumentWithFiles } from '@/app/actions/documents-formdata'
import { deleteFile } from '@/app/actions/documents'
import { Trash2, FileText, Shield } from 'lucide-react'

interface EditDocumentFormProps {
  document: any
}

export default function EditDocumentForm({ document }: EditDocumentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [description, setDescription] = useState(document.description || '')
  const [projectCode, setProjectCode] = useState(document.project_code || '')
  const [files, setFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState(document.document_files || [])

  const handleDeleteFile = async (fileId: string) => {
    try {
      const result = await deleteFile(document.id, fileId)
      
      if (result.success) {
        setExistingFiles(existingFiles.filter((f: any) => f.id !== fileId))
        toast.success('File deleted')
      } else {
        toast.error(result.error || 'Failed to delete file')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate project code format if provided
    if (projectCode && !/^P-\d{5}$/.test(projectCode.toUpperCase())) {
      toast.error('Project code must be in format P-##### (e.g., P-12345)')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Show background scanning notice if files present
      if (files.length > 0) {
        toast.info(
          `Uploading ${files.length} file${files.length > 1 ? 's' : ''}. Virus scanning will happen in the background.`,
          { duration: 4000 }
        )
      }

      // Create FormData for proper file handling
      const formData = new FormData()
      formData.append('documentId', document.id)
      formData.append('title', title)
      formData.append('description', description)
      if (projectCode) {
        formData.append('projectCode', projectCode.toUpperCase())
      }
      
      // Append all files
      files.forEach(file => {
        formData.append('files', file)
      })

      const result = await updateDocumentWithFiles(formData)

      if (result.success) {
        toast.success(
          files.length > 0
            ? `Document updated! ${result.filesUploaded} file(s) queued for virus scanning.`
            : 'Document updated successfully'
        )
        
        router.push(`/documents?selected=${result.documentNumber}&version=${result.version}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update document')
      }
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document Number (read-only) */}
      <div>
        <Label>Document Number</Label>
        <Input 
          value={`${document.document_number}${document.version}`}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Document Type (read-only) */}
      <div>
        <Label>Document Type</Label>
        <Input 
          value={document.document_type?.name || 'Unknown'}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter document description (optional)"
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      {/* Project Code */}
      <div>
        <Label htmlFor="projectCode">Project Code</Label>
        <Input
          id="projectCode"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value)}
          placeholder="P-##### (e.g., P-12345)"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Format: P-##### (e.g., P-12345)
        </p>
      </div>

      {/* Current Files */}
      {existingFiles.length > 0 && (
        <div>
          <Label>Current Files</Label>
          <div className="space-y-2 mt-2">
            {existingFiles.map((file: any) => {
              const scanStatus = file.scan_status || 'safe'
              const isBlocked = scanStatus === 'blocked'
              
              return (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isBlocked ? 'bg-red-50 border-red-200' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className={`h-5 w-5 ${isBlocked ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <ScanStatusBadge status={scanStatus} showText={false} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {isBlocked && file.scan_result && (
                        <p className="text-xs text-red-600 mt-1">
                          Malware detected: {file.scan_result.malicious || 0} threats found
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New Files */}
      <div>
        <Label>Add New Files</Label>
        <FileUpload files={files} onFilesChange={setFiles} />
        
        {/* Background scanning notice */}
        {files.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Background Virus Scanning</p>
                <p>
                  {files.length === 1 
                    ? 'This file will be scanned for viruses in the background. You can continue working immediately.'
                    : `All ${files.length} files will be scanned for viruses in the background. You can continue working immediately.`
                  }
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Scanning typically completes within 2-5 minutes. Files show "⏳ Pending" status until scanned.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/documents/${document.id}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
