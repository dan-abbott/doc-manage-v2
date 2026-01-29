'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/documents/FileUpload'
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'scanning' | 'uploading'>('idle')
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
      
      // Set status based on whether files are being uploaded
      if (files.length > 0) {
        setUploadStatus('scanning')
        
        // Show toast about virus scanning
        toast.info('Scanning files for viruses...', {
          duration: 5000,
        })
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
        toast.success('Document updated successfully')
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
      setUploadStatus('idle')
    }
  }

  // Determine button text based on state
  const getButtonText = () => {
    if (!isSubmitting) return 'Save Changes'
    if (files.length > 0 && uploadStatus === 'scanning') {
      return 'Virus Scanning...'
    }
    return 'Saving...'
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
            {existingFiles.map((file: any) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
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
            ))}
          </div>
        </div>
      )}

      {/* New Files */}
      <div>
        <Label>Add New Files</Label>
        <FileUpload files={files} onFilesChange={setFiles} />
        
        {/* Virus scanning notice */}
        {files.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Files will be scanned for viruses before upload</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && files.length > 0 && (
            <Shield className="h-4 w-4 mr-2 animate-pulse" />
          )}
          {getButtonText()}
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
