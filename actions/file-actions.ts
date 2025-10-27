'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// Types
// ==========================================

export interface UploadFileInput {
  documentId: string
  file: File
  originalFileName: string
}

// ==========================================
// Helper: Log Audit Entry
// ==========================================

async function logAudit(
  supabase: any,
  documentId: string,
  action: string,
  userId: string,
  userEmail: string,
  details?: any
) {
  const { error } = await supabase.rpc('log_audit_entry', {
    p_document_id: documentId,
    p_action: action,
    p_performed_by: userId,
    p_performed_by_email: userEmail,
    p_details: details || null
  })

  if (error) {
    console.error('Failed to log audit entry:', error)
  }
}

// ==========================================
// Action: Upload File
// ==========================================

export async function uploadFile(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Extract form data
    const documentId = formData.get('documentId') as string
    const file = formData.get('file') as File

    if (!documentId || !file) {
      return { success: false, error: 'Document ID and file are required' }
    }

    // Get document to verify ownership and get document number
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, document_type:document_types(prefix)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Check ownership
    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to upload files to this document' }
    }

    // Check status - only Draft can have files uploaded
    if (document.status !== 'Draft') {
      return { 
        success: false, 
        error: 'Files can only be uploaded to Draft documents' 
      }
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      return { 
        success: false, 
        error: 'File size exceeds 50MB limit' 
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: 'Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, CSV' 
      }
    }

    // Generate file path: documents/{document-id}/{filename}
    const originalFileName = file.name
    const filePath = `${documentId}/${originalFileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })
      console.log('=== UPLOAD DEBUG ===')
      console.log('File path:', filePath)
      console.log('Upload error:', uploadError)
      console.log('Upload error details:', JSON.stringify(uploadError, null, 2))


    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      
      // Check if file already exists
      if (uploadError.message?.includes('already exists')) {
        return { 
          success: false, 
          error: 'A file with this name already exists. Please rename and try again.' 
        }
      }
      
      return { 
        success: false, 
        error: uploadError.message || 'Failed to upload file' 
      }
    }

    // Create display name with document number prefix
    const displayName = `${document.document_number}${document.version} ${originalFileName}`

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('document_files')
      .insert({
        document_id: documentId,
        file_name: displayName,
        original_file_name: originalFileName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      })
      console.log('=== DATABASE INSERT DEBUG ===')
      console.log('DB Error:', dbError)
      console.log('DB Error details:', JSON.stringify(dbError, null, 2))
      
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      
      // Try to clean up storage if database insert fails
      await supabase.storage.from('documents').remove([filePath])
      
      return { success: false, error: 'Failed to save file metadata' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      documentId,
      'file_uploaded',
      user.id,
      user.email || '',
      {
        file_name: originalFileName,
        file_size: file.size,
        mime_type: file.type
      }
    )

    revalidatePath(`/documents/${documentId}`)

    return { 
      success: true, 
      file: fileRecord,
      message: 'File uploaded successfully' 
    }
  } catch (error: any) {
    console.error('Upload file error:', error)
    return { success: false, error: error.message || 'Failed to upload file' }
  }
}

// ==========================================
// Action: Delete File
// ==========================================

export async function deleteFile(fileId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get file with document info
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select(`
        *,
        document:documents(id, created_by, status)
      `)
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found' }
    }

    // Check document ownership
    if (file.document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to delete this file' }
    }

    // Check document status - only Draft documents can have files deleted
    if (file.document.status !== 'Draft') {
      return { 
        success: false, 
        error: 'Files can only be deleted from Draft documents' 
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([file.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway - we'll delete the database record
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('document_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      console.error('Delete file error:', deleteError)
      return { success: false, error: 'Failed to delete file' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      file.document_id,
      'file_deleted',
      user.id,
      user.email || '',
      {
        file_name: file.original_file_name,
        file_size: file.file_size
      }
    )

    revalidatePath(`/documents/${file.document_id}`)

    return { 
      success: true, 
      message: 'File deleted successfully' 
    }
  } catch (error: any) {
    console.error('Delete file error:', error)
    return { success: false, error: error.message || 'Failed to delete file' }
  }
}

// ==========================================
// Action: Get File Download URL
// ==========================================

export async function getFileDownloadUrl(fileId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get file with document info (RLS will check access)
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select(`
        *,
        document:documents(id, created_by, status)
      `)
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found or access denied' }
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 3600) // 3600 seconds = 1 hour

    if (urlError || !signedUrl) {
      console.error('Create signed URL error:', urlError)
      return { success: false, error: 'Failed to generate download URL' }
    }

    return {
      success: true,
      url: signedUrl.signedUrl,
      fileName: file.original_file_name
    }
  } catch (error: any) {
    console.error('Get download URL error:', error)
    return { success: false, error: error.message || 'Failed to get download URL' }
  }
}

// ==========================================
// Action: Upload Multiple Files
// ==========================================

export async function uploadMultipleFiles(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const documentId = formData.get('documentId') as string
    if (!documentId) {
      return { success: false, error: 'Document ID is required' }
    }

    // Get all files from FormData
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return { success: false, error: 'No files provided' }
    }

    // Verify document access once
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, document_type:document_types(prefix)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Files can only be uploaded to Draft documents' }
    }

    // Upload all files
    const results = []
    const errors = []

    for (const file of files) {
      const fileFormData = new FormData()
      fileFormData.append('documentId', documentId)
      fileFormData.append('file', file)

      const result = await uploadFile(fileFormData)
      
      if (result.success) {
        results.push(result.file)
      } else {
        errors.push({ fileName: file.name, error: result.error })
      }
    }

    revalidatePath(`/documents/${documentId}`)

    return {
      success: true,
      uploaded: results.length,
      failed: errors.length,
      files: results,
      errors: errors,
      message: `Uploaded ${results.length} of ${files.length} files`
    }
  } catch (error: any) {
    console.error('Upload multiple files error:', error)
    return { success: false, error: error.message || 'Failed to upload files' }
  }
}
