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
import { Trash2, FileText } from 'lucide-react'

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
          required
          maxLength={200}
          placeholder="Enter document title"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          placeholder="Enter document description (optional)"
          rows={4}
        />
      </div>

      {/* Project Code */}
      <div>
        <Label htmlFor="project_code">Project Code</Label>
        <Input
          id="project_code"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
          placeholder="P-12345 (optional)"
          maxLength={7}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Format: P-##### (e.g., P-12345)
        </p>
      </div>

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div>
          <Label>Current Files</Label>
          <div className="mt-2 space-y-2">
            {existingFiles.map((file: any) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{file.file_name}</p>
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
