'use client'

import { useState, useEffect } from 'react'
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

  // DEBUG: Log component mount and props
  useEffect(() => {
    console.log('🐛 [EditDocumentForm] Component mounted')
    console.log('🐛 [EditDocumentForm] Document ID:', document.id)
    console.log('🐛 [EditDocumentForm] Document Number:', document.document_number)
    console.log('🐛 [EditDocumentForm] Build timestamp:', new Date().toISOString())
  }, [])

  // DEBUG: Log file changes
  useEffect(() => {
    console.log('🐛 [EditDocumentForm] Files changed:', {
      count: files.length,
      names: files.map(f => f.name),
      sizes: files.map(f => f.size)
    })
  }, [files])

  const handleDeleteFile = async (fileId: string) => {
    console.log('🐛 [EditDocumentForm] handleDeleteFile called:', fileId)
    try {
      const result = await deleteFile(document.id, fileId)
      
      if (result.success) {
        setExistingFiles(existingFiles.filter((f: any) => f.id !== fileId))
        toast.success('File deleted')
      } else {
        toast.error(result.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('🐛 [EditDocumentForm] Delete file error:', error)
      toast.error('An error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🐛 [EditDocumentForm] ========== FORM SUBMIT STARTED ==========')
    console.log('🐛 [EditDocumentForm] Files to upload:', files.length)
    console.log('🐛 [EditDocumentForm] Form action: updateDocumentWithFiles')
    console.log('🐛 [EditDocumentForm] Timestamp:', new Date().toISOString())

    // Validate project code format if provided
    if (projectCode && !/^P-\d{5}$/.test(projectCode.toUpperCase())) {
      console.log('🐛 [EditDocumentForm] Project code validation failed')
      toast.error('Project code must be in format P-##### (e.g., P-12345)')
      return
    }

    try {
      setIsSubmitting(true)
      console.log('🐛 [EditDocumentForm] isSubmitting set to true')
      
      // Show background scanning notice if files present
      if (files.length > 0) {
        const message = `Uploading ${files.length} file${files.length > 1 ? 's' : ''}. Virus scanning will happen in the background.`
        console.log('🐛 [EditDocumentForm] Showing toast:', message)
        toast.info(message, { duration: 4000 })
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
      files.forEach((file, index) => {
        console.log(`🐛 [EditDocumentForm] Appending file ${index + 1}:`, file.name, file.size)
        formData.append('files', file)
      })

      console.log('🐛 [EditDocumentForm] Calling updateDocumentWithFiles...')
      const startTime = Date.now()
      
      const result = await updateDocumentWithFiles(formData)
      
      const duration = Date.now() - startTime
      console.log('🐛 [EditDocumentForm] updateDocumentWithFiles completed in', duration, 'ms')
      console.log('🐛 [EditDocumentForm] Result:', result)

      if (result.success) {
        const successMessage = files.length > 0
          ? `Document updated! ${result.filesUploaded} file(s) queued for virus scanning.`
          : 'Document updated successfully'
        
        console.log('🐛 [EditDocumentForm] Success! Message:', successMessage)
        toast.success(successMessage)
        
        console.log('🐛 [EditDocumentForm] Redirecting to documents page')
        router.push(`/documents?selected=${result.documentNumber}&version=${result.version}`)
        router.refresh()
      } else {
        console.error('🐛 [EditDocumentForm] Server returned error:', result.error)
        toast.error(result.error || 'Failed to update document')
      }
    } catch (error: any) {
      console.error('🐛 [EditDocumentForm] Exception caught:', error)
      console.error('🐛 [EditDocumentForm] Error stack:', error.stack)
      toast.error('An unexpected error occurred')
    } finally {
      console.log('🐛 [EditDocumentForm] Setting isSubmitting to false')
      setIsSubmitting(false)
      console.log('🐛 [EditDocumentForm] ========== FORM SUBMIT ENDED ==========')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* DEBUG INFO */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
        <div className="font-bold mb-2">🐛 DEBUG INFO</div>
        <div>Component: EditDocumentForm.tsx</div>
        <div>Document ID: {document.id}</div>
        <div>Files selected: {files.length}</div>
        <div>Action: updateDocumentWithFiles</div>
        <div className="mt-2 text-yellow-700">
          Check browser console (F12) for detailed logs
        </div>
      </div>

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
