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
import { addApprover, removeApprover } from '@/app/actions/approvals'
import { Trash2, FileText, X, UserPlus } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
}

interface Approver {
  id: string
  user_id: string
  user_email: string
  status: string
}

interface EditDocumentFormProps {
  document: any
  availableUsers: User[]
}

export default function EditDocumentForm({ document, availableUsers }: EditDocumentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [description, setDescription] = useState(document.description || '')
  const [projectCode, setProjectCode] = useState(document.project_code || '')
  const [files, setFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState(document.document_files || [])
  
  // Approver state
  const [approvers, setApprovers] = useState<Approver[]>(document.approvers || [])
  const [showApproverDropdown, setShowApproverDropdown] = useState(false)
  const [approverSearch, setApproverSearch] = useState('')

  // Filter available users (exclude current approvers)
  const approverUserIds = approvers.map(a => a.user_id)
  const filteredUsers = availableUsers.filter(user => {
    // Exclude already selected approvers
    if (approverUserIds.includes(user.id)) return false
    
    // If search term exists, filter by name or email
    if (approverSearch.trim()) {
      const search = approverSearch.toLowerCase()
      const matchesEmail = user.email.toLowerCase().includes(search)
      const matchesName = user.full_name?.toLowerCase().includes(search)
      return matchesEmail || matchesName
    }
    
    // No search term = show all available users
    return true
  })

  // Debug logging (remove after testing)
  console.log('Approver Search Debug:', {
    totalAvailable: availableUsers.length,
    currentApprovers: approvers.length,
    filteredResults: filteredUsers.length,
    searchTerm: approverSearch
  })

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

  const handleAddApprover = async (user: User) => {
    try {
      const result = await addApprover(document.id, user.id, user.email)
      
      if (result.success) {
        // Add to local state
        setApprovers([...approvers, {
          id: crypto.randomUUID(), // Temporary ID
          user_id: user.id,
          user_email: user.email,
          status: 'Pending'
        }])
        setApproverSearch('')
        setShowApproverDropdown(false)
        toast.success(`Added ${user.email} as approver`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to add approver')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleRemoveApprover = async (approverId: string) => {
    try {
      const result = await removeApprover(document.id, approverId)
      
      if (result.success) {
        setApprovers(approvers.filter(a => a.id !== approverId))
        toast.success('Approver removed')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to remove approver')
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

      {/* Approvers Management */}
      <div>
        <Label>Approvers</Label>
        
        {/* Current Approvers */}
        {approvers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {approvers.map(approver => (
              <div
                key={approver.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <span>{approver.user_email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveApprover(approver.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  title="Remove approver"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Approver */}
        <div className="relative">
          {/* Click outside to close - render first so it's behind dropdown */}
          {showApproverDropdown && (
            <div
              className="fixed inset-0 z-[5]"
              onClick={() => setShowApproverDropdown(false)}
            />
          )}

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search users to add as approvers..."
              value={approverSearch}
              onChange={(e) => {
                setApproverSearch(e.target.value)
                setShowApproverDropdown(true)
              }}
              onFocus={() => setShowApproverDropdown(true)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowApproverDropdown(!showApproverDropdown)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Dropdown */}
          {showApproverDropdown && (
            <div className="absolute z-[15] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {/* Show filtered users */}
              {filteredUsers.length > 0 ? (
                <>
                  <div className="px-3 py-1 text-xs text-gray-500 border-b bg-gray-50">
                    {filteredUsers.length} user{filteredUsers.length > 1 ? 's' : ''} available
                  </div>
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleAddApprover(user)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b last:border-b-0"
                    >
                      {user.full_name ? (
                        <>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </>
                      ) : (
                        <div className="font-medium">{user.email}</div>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                /* No results message */
                <div className="px-3 py-3 text-sm text-gray-500">
                  {availableUsers.length === 0 ? (
                    <div>
                      <p className="font-medium text-gray-700">No users available</p>
                      <p className="text-xs mt-1">There are no other users in the system yet.</p>
                    </div>
                  ) : approverSearch.trim() ? (
                    <div>
                      <p className="font-medium text-gray-700">No matches found</p>
                      <p className="text-xs mt-1">No users match &quot;{approverSearch}&quot;</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-700">All users already added</p>
                      <p className="text-xs mt-1">All available users are already approvers.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          {approvers.length === 0 
            ? 'No approvers assigned. Document can be released directly without approval.'
            : `${approvers.length} approver${approvers.length > 1 ? 's' : ''} assigned. Document will require approval before release.`
          }
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
