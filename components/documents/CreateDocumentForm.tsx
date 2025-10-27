'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createDocument } from '@/actions/document-actions'
import { uploadMultipleFiles } from '@/actions/file-actions'
import { FileUpload } from '@/components/documents/FileUpload'
import { toast } from 'sonner'

interface DocumentType {
  id: string
  name: string
  prefix: string
  description: string | null
  is_active: boolean
}

interface CreateDocumentFormProps {
  documentTypes: DocumentType[]
}

export function CreateDocumentForm({ documentTypes }: CreateDocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    document_type_id: '',
    title: '',
    description: '',
    project_code: '',
    is_production: false
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter active document types only
  const activeTypes = documentTypes.filter(type => type.is_active)

  // Validate form
  function validate() {
    const newErrors: Record<string, string> = {}

    if (!formData.document_type_id) {
      newErrors.document_type_id = 'Document type is required'
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (formData.project_code) {
      const projectCodeRegex = /^P-\d{5}$/
      if (!projectCodeRegex.test(formData.project_code)) {
        newErrors.project_code = 'Project code must be in format P-##### (e.g., P-12345)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!validate()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create document
      const docResult = await createDocument({
        document_type_id: formData.document_type_id,
        title: formData.title,
        description: formData.description || undefined,
        project_code: formData.project_code || undefined,
        is_production: formData.is_production
      })

      if (!docResult.success) {
        toast.error(docResult.error || 'Failed to create document')
        setLoading(false)
        return
      }

      toast.success(docResult.message || 'Document created successfully')

      // Step 2: Upload files if any
      if (selectedFiles.length > 0) {
        console.log('📁 Starting file upload...')
        console.log('Number of files:', selectedFiles.length)
        console.log('File names:', selectedFiles.map(f => f.name))
        console.log('Document ID:', docResult.document.id)

        const fileFormData = new FormData()
        fileFormData.append('documentId', docResult.document.id)
        
        selectedFiles.forEach((file, index) => {
          console.log(`Adding file ${index}:`, file.name, file.size, 'bytes')
          fileFormData.append(`file-${index}`, file)
        })

        console.log('FormData keys:', Array.from(fileFormData.keys()))
        console.log('Calling uploadMultipleFiles...')

        const uploadResult = await uploadMultipleFiles(fileFormData)

        console.log('Upload result:', uploadResult)
        console.log('Upload result full:', JSON.stringify(uploadResult, null, 2))

        if (uploadResult.success) {
          if (uploadResult.failed && uploadResult.failed > 0) {
            toast.warning(
              `Uploaded ${uploadResult.uploaded} of ${selectedFiles.length} files. ${uploadResult.failed} failed.`
            )
          } else {
            toast.success(`All ${uploadResult.uploaded} files uploaded successfully`)
          }
        } else {
          toast.error('Failed to upload files')
        }
      }

            // Navigate to document detail page (TEMPORARILY DISABLED - page doesn't exist yet)
      console.log('✅ Document created successfully!')
      console.log('Document ID:', docResult.document.id)
      console.log('Document Number:', docResult.document.document_number + docResult.document.version)
      
      if (selectedFiles.length > 0) {
        console.log('Files uploaded:', selectedFiles.map(f => f.name))
      }
      
      toast.success(
        `Document ${docResult.document.document_number}${docResult.document.version} created! Check console for details.`
      )
      
      // TODO: Uncomment after building document detail page (Step 6)
      // router.push(`/documents/${docResult.document.id}`)
      
      setLoading(false)  // Re-enable form so you can create another document
      
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(error.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document Type Selection */}
      <div>
        <label 
          htmlFor="document_type_id" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Document Type <span className="text-red-500">*</span>
        </label>
        <select
          id="document_type_id"
          value={formData.document_type_id}
          onChange={(e) => {
            setFormData({ ...formData, document_type_id: e.target.value })
            setErrors({ ...errors, document_type_id: '' })
          }}
          disabled={loading}
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${errors.document_type_id ? 'border-red-500' : 'border-gray-300'}
          `}
        >
          <option value="">Select a document type</option>
          {activeTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.prefix})
            </option>
          ))}
        </select>
        {errors.document_type_id && (
          <p className="mt-1 text-sm text-red-600">{errors.document_type_id}</p>
        )}
        {activeTypes.length === 0 && (
          <p className="mt-1 text-sm text-amber-600">
            No active document types available. Please contact an administrator.
          </p>
        )}
      </div>

      {/* Production Classification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Classification <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="is_production"
              checked={!formData.is_production}
              onChange={() => setFormData({ ...formData, is_production: false })}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Prototype</div>
              <div className="text-sm text-gray-500">
                Development, testing, or pre-production document
              </div>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="is_production"
              checked={formData.is_production}
              onChange={() => setFormData({ ...formData, is_production: true })}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Production</div>
              <div className="text-sm text-gray-500">
                Released for operational use (requires approval)
              </div>
            </div>
          </label>
        </div>
        
        {formData.is_production && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Production documents require approval workflow. 
              This feature will be available in Phase 5.
            </p>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label 
          htmlFor="title" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value })
            setErrors({ ...errors, title: '' })
          }}
          disabled={loading}
          placeholder="Enter document title"
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${errors.title ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label 
          htmlFor="description" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={loading}
          placeholder="Enter document description (optional)"
          rows={4}
          className="
            w-full px-4 py-2 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            resize-vertical
          "
        />
      </div>

      {/* Project Code */}
      <div>
        <label 
          htmlFor="project_code" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Project Code
        </label>
        <input
          id="project_code"
          type="text"
          value={formData.project_code}
          onChange={(e) => {
            setFormData({ ...formData, project_code: e.target.value.toUpperCase() })
            setErrors({ ...errors, project_code: '' })
          }}
          disabled={loading}
          placeholder="P-12345"
          className={`
            w-full px-4 py-2 border rounded-lg font-mono
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${errors.project_code ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {errors.project_code && (
          <p className="mt-1 text-sm text-red-600">{errors.project_code}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Format: P-##### (e.g., P-12345). Optional.
        </p>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attach Files
        </label>
        <FileUpload
          files={selectedFiles}
          onFilesChange={setSelectedFiles}
          disabled={loading}
        />
        <p className="mt-2 text-sm text-gray-500">
          Optional. You can also upload files after creating the document.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="
            px-6 py-2 border border-gray-300 rounded-lg
            text-gray-700 font-medium
            hover:bg-gray-50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Cancel
        </button>
        
        <button
          type="submit"
          disabled={loading || activeTypes.length === 0}
          className="
            px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
            hover:bg-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            flex items-center space-x-2
          "
        >
          {loading ? (
            <>
              <svg 
                className="animate-spin h-5 w-5" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Creating...</span>
            </>
          ) : (
            <span>Create Document</span>
          )}
        </button>
      </div>
    </form>
  )
}
