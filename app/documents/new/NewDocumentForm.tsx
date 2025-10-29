'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/documents/FileUpload'
import { createDocument } from '@/app/actions/documents'

interface NewDocumentFormProps {
  documentTypes: Array<{ id: string; name: string; is_active: boolean }>
}

export default function NewDocumentForm({ documentTypes }: NewDocumentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isProduction, setIsProduction] = useState(false)
  const [projectCode, setProjectCode] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!documentTypeId) {
        setError('Please select a document type')
        setIsSubmitting(false)
        return
      }

      if (!title.trim()) {
        setError('Please enter a title')
        setIsSubmitting(false)
        return
      }

      // Validate project code format if provided
      if (projectCode && !/^P-\d{5}$/.test(projectCode)) {
        setError('Project code must be in format P-##### (e.g., P-12345)')
        setIsSubmitting(false)
        return
      }

      // Create document
      const result = await createDocument(
        {
          document_type_id: documentTypeId,
          title: title.trim(),
          description: description.trim(),
          is_production: isProduction,
          project_code: projectCode || null,
        },
        files
      )

      if (result.success && result.documentId) {
        // Redirect to the new document's detail page
        router.push(`/documents/${result.documentId}`)
      } else {
        setError(result.error || 'Failed to create document')
        setIsSubmitting(false)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  const activeDocumentTypes = documentTypes.filter(dt => dt.is_active)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Document Type */}
      <div>
        <Label htmlFor="documentType">
          Document Type <span className="text-red-500">*</span>
        </Label>
        <select
          id="documentType"
          value={documentTypeId}
          onChange={(e) => setDocumentTypeId(e.target.value)}
          required
          disabled={isSubmitting}
          className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select a document type</option>
          {activeDocumentTypes.map((dt) => (
            <option key={dt.id} value={dt.id}>
              {dt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Production Classification */}
      <div>
        <Label>Classification <span className="text-red-500">*</span></Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="classification"
              value="prototype"
              checked={!isProduction}
              onChange={() => setIsProduction(false)}
              disabled={isSubmitting}
              className="h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm">
              Prototype (vA, vB, vC...)
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="classification"
              value="production"
              checked={isProduction}
              onChange={() => setIsProduction(true)}
              disabled={isSubmitting}
              className="h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm">
              Production (v1, v2, v3...)
            </span>
          </label>
        </div>
        {isProduction && (
          <p className="mt-2 text-sm text-yellow-600">
            ⚠️ Production documents require approval workflow
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title"
          required
          disabled={isSubmitting}
          maxLength={200}
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
          maxLength={1000}
        />
      </div>

      {/* Project Code */}
      <div>
        <Label htmlFor="projectCode">Project Code</Label>
        <Input
          id="projectCode"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
          placeholder="P-12345"
          disabled={isSubmitting}
          maxLength={7}
          pattern="P-\d{5}"
        />
        <p className="mt-1 text-sm text-gray-500">
          Format: P-##### (e.g., P-12345)
        </p>
      </div>

      {/* File Upload */}
      <div>
        <Label>Attachments</Label>
        <div className="mt-2">
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            maxFiles={20}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Creating...' : 'Create Document'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/documents')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
