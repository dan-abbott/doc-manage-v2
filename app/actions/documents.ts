'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// Action: Create Document
// ==========================================

export async function createDocument(data: {
  document_type_id: string
  title: string
  description: string
  is_production: boolean
  project_code: string | null
}, files: File[]) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document type for prefix and number
    const { data: docType, error: typeError } = await supabase
      .from('document_types')
      .select('prefix, next_number')
      .eq('id', data.document_type_id)
      .single()

    if (typeError || !docType) {
      return { success: false, error: 'Document type not found' }
    }

    // Generate document number
    const documentNumber = `${docType.prefix}-${String(docType.next_number).padStart(5, '0')}`
    
    // Determine version based on production flag
    const version = data.is_production ? 'v1' : 'vA'

    // Create document
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        document_type_id: data.document_type_id,
        document_number: documentNumber,
        version: version,
        title: data.title,
        description: data.description,
        is_production: data.is_production,
        project_code: data.project_code,
        status: 'Draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (createError || !document) {
      return { success: false, error: 'Failed to create document' }
    }

    // Increment document type counter
    await supabase
      .from('document_types')
      .update({ next_number: docType.next_number + 1 })
      .eq('id', data.document_type_id)

    // Upload files
    if (files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        // Generate unique file path with document number prefix
        const fileName = `${documentNumber}${version}_${file.name}`
        const filePath = `${document.id}/${fileName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error('File upload error:', uploadError)
          return null
        }

        // Save file metadata
        const { error: metaError } = await supabase
          .from('document_files')
          .insert({
            document_id: document.id,
            file_name: fileName,
            original_file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })

        if (metaError) {
          console.error('File metadata error:', metaError)
          return null
        }

        return fileName
      })

      await Promise.all(uploadPromises)
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        document_id: document.id,
        action: 'created',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          document_number: documentNumber,
          version: version,
          title: data.title 
        },
      })

    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      documentId: document.id,
      documentNumber: `${documentNumber}${version}`
    }
  } catch (error: any) {
    console.error('Create document error:', error)
    return { success: false, error: error.message || 'Failed to create document' }
  }
}

// ==========================================
// Action: Update Document
// ==========================================

export async function updateDocument(
  documentId: string,
  data: {
    title: string
    description: string
    project_code: string | null
  },
  newFiles: File[] = []
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document to check ownership and status
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Only Draft documents can be edited' }
    }

    // Update document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        title: data.title,
        description: data.description,
        project_code: data.project_code,
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: 'Failed to update document' }
    }

    // Upload new files
    if (newFiles.length > 0) {
      const uploadPromises = newFiles.map(async (file) => {
        const fileName = `${document.document_number}${document.version}_${file.name}`
        const filePath = `${document.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error('File upload error:', uploadError)
          return null
        }

        await supabase
          .from('document_files')
          .insert({
            document_id: document.id,
            file_name: fileName,
            original_file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })

        return fileName
      })

      await Promise.all(uploadPromises)
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'updated',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { changes: data },
      })

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')

    return { success: true }
  } catch (error: any) {
    console.error('Update document error:', error)
    return { success: false, error: error.message || 'Failed to update document' }
  }
}

// ==========================================
// Action: Delete Document
// ==========================================

export async function deleteDocument(documentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document to check ownership and status
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*, document_files(*)')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { 
        success: false, 
        error: 'Only Draft documents can be deleted' 
      }
    }

    // Delete all files from storage
    if (document.document_files && document.document_files.length > 0) {
      const filePaths = document.document_files.map((f: any) => f.file_path)
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(filePaths)

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }
    }

    // Delete document (cascade will remove files)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Delete document error:', deleteError)
      return { success: false, error: 'Failed to delete document' }
    }

    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      message: 'Document deleted successfully' 
    }
  } catch (error: any) {
    console.error('Delete document error:', error)
    return { success: false, error: error.message || 'Failed to delete document' }
  }
}

// ==========================================
// Action: Delete File
// ==========================================

export async function deleteFile(documentId: string, fileId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get file and document
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select('*, document:documents(id, status, created_by)')
      .eq('id', fileId)
      .eq('document_id', documentId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found' }
    }

    const document = file.document as any

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Can only delete files from Draft documents' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([file.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete file record
    const { error: deleteError } = await supabase
      .from('document_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      return { success: false, error: 'Failed to delete file' }
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'file_deleted',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { file_name: file.file_name },
      })

    revalidatePath(`/documents/${documentId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Delete file error:', error)
    return { success: false, error: error.message || 'Failed to delete file' }
  }
}

// ==========================================
// Action: Release Document
// ==========================================

export async function releaseDocument(documentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document with approvers count
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*, approvers:approvers(count)')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Only Draft documents can be released' }
    }

    if (document.is_production) {
      return { 
        success: false, 
        error: 'Production documents require approval workflow' 
      }
    }

    // Check if there are approvers - if yes, must use submitForApproval instead
    const approverCount = document.approvers?.[0]?.count || 0
    if (approverCount > 0) {
      return {
        success: false,
        error: 'This document has approvers assigned. Use "Submit for Approval" instead of "Release".'
      }
    }

    // Update document to Released
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'Released',
        released_at: new Date().toISOString(),
        released_by: user.id,
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: 'Failed to release document' }
    }

    // Handle obsolescence: make immediate predecessor obsolete
    // Get the immediate predecessor version
    const { getImmediatePredecessor } = await import('./versions')
    const predecessorResult = await getImmediatePredecessor(
      document.document_number,
      document.version
    )

    if (predecessorResult.success && predecessorResult.data) {
      const predecessor = predecessorResult.data
      
      // Only obsolete if predecessor is Released
      if (predecessor.status === 'Released') {
        await supabase
          .from('documents')
          .update({ status: 'Obsolete' })
          .eq('id', predecessor.id)

        // Log obsolescence
        await supabase
          .from('audit_log')
          .insert({
            document_id: predecessor.id,
            action: 'document_obsoleted',
            performed_by: user.id,
            performed_by_email: user.email,
            details: {
              document_number: `${predecessor.document_number}${predecessor.version}`,
              obsoleted_by_version: document.version,
            },
          })
      }
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'released',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          document_number: `${document.document_number}${document.version}` 
        },
      })

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error('Release document error:', error)
    return { success: false, error: error.message || 'Failed to release document' }
  }
}
