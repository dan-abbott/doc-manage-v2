'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ==========================================
// Types
// ==========================================

export type DocumentStatus = 'Draft' | 'In Approval' | 'Released' | 'Obsolete'

export interface Document {
  id: string
  document_type_id: string
  document_number: string
  version: string
  title: string
  description: string | null
  status: DocumentStatus
  is_production: boolean
  project_code: string | null
  created_by: string
  created_at: string
  updated_at: string
  released_at: string | null
  released_by: string | null
}

export interface DocumentFile {
  id: string
  document_id: string
  file_name: string
  original_file_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: string
  uploaded_at: string
}

export interface CreateDocumentInput {
  document_type_id: string
  title: string
  description?: string
  project_code?: string
  is_production?: boolean
}

export interface UpdateDocumentInput {
  title?: string
  description?: string
  project_code?: string
}

// ==========================================
// Helper: Generate Next Document Number
// ==========================================

async function generateDocumentNumber(
  supabase: any,
  documentTypeId: string
): Promise<{ documentNumber: string; version: string }> {
  // Get document type with prefix
  const { data: docType, error: typeError } = await supabase
    .from('document_types')
    .select('prefix, next_number')
    .eq('id', documentTypeId)
    .single()

  if (typeError || !docType) {
    throw new Error('Document type not found')
  }

  // Format number with leading zeros (5 digits)
  const paddedNumber = String(docType.next_number).padStart(5, '0')
  const documentNumber = `${docType.prefix}-${paddedNumber}`
  
  // First version is always vA for Prototype
  const version = 'vA'

  // Increment next_number for this document type
  const { error: updateError } = await supabase
    .from('document_types')
    .update({ next_number: docType.next_number + 1 })
    .eq('id', documentTypeId)

  if (updateError) {
    throw new Error('Failed to increment document number')
  }

  return { documentNumber, version }
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
    // Don't throw - audit logging failure shouldn't break main operation
  }
}

// ==========================================
// Action: Create Document
// ==========================================

export async function createDocument(input: CreateDocumentInput) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate project code format if provided
    if (input.project_code) {
      const projectCodeRegex = /^P-\d{5}$/
      if (!projectCodeRegex.test(input.project_code)) {
        return { 
          success: false, 
          error: 'Project code must be in format P-##### (e.g., P-12345)' 
        }
      }
    }

    // Generate document number and version
    const { documentNumber, version } = await generateDocumentNumber(
      supabase,
      input.document_type_id
    )

    // Create document
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        document_type_id: input.document_type_id,
        document_number: documentNumber,
        version: version,
        title: input.title,
        description: input.description || null,
        status: 'Draft',
        is_production: input.is_production || false,
        project_code: input.project_code || null,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Create document error:', createError)
      return { success: false, error: 'Failed to create document' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      document.id,
      'created',
      user.id,
      user.email || '',
      {
        document_number: documentNumber,
        version: version,
        title: input.title
      }
    )

    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      document,
      message: `Document ${documentNumber}${version} created successfully` 
    }
  } catch (error: any) {
    console.error('Create document error:', error)
    return { success: false, error: error.message || 'Failed to create document' }
  }
}

// ==========================================
// Action: Get Document Details
// ==========================================

export async function getDocument(documentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document with related data (RLS will filter access)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        document_type:document_types(id, name, prefix),
        creator:users!documents_created_by_fkey(id, email, full_name),
        releaser:users!documents_released_by_fkey(id, email, full_name)
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found or access denied' }
    }

    // Get files for this document
    const { data: files, error: filesError } = await supabase
      .from('document_files')
      .select('*')
      .eq('document_id', documentId)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('Get files error:', filesError)
    }

    // Get audit log for this document
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (auditError) {
      console.error('Get audit log error:', auditError)
    }

    return {
      success: true,
      document,
      files: files || [],
      auditLog: auditLog || []
    }
  } catch (error: any) {
    console.error('Get document error:', error)
    return { success: false, error: error.message || 'Failed to get document' }
  }
}

// ==========================================
// Action: Update Document
// ==========================================

export async function updateDocument(
  documentId: string, 
  input: UpdateDocumentInput
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate project code format if provided
    if (input.project_code) {
      const projectCodeRegex = /^P-\d{5}$/
      if (!projectCodeRegex.test(input.project_code)) {
        return { 
          success: false, 
          error: 'Project code must be in format P-##### (e.g., P-12345)' 
        }
      }
    }

    // Get current document to check ownership and status
    const { data: currentDoc, error: getError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (getError || !currentDoc) {
      return { success: false, error: 'Document not found' }
    }

    // Check ownership
    if (currentDoc.created_by !== user.id) {
      return { success: false, error: 'Not authorized to update this document' }
    }

    // Check status - only Draft can be edited
    if (currentDoc.status !== 'Draft') {
      return { 
        success: false, 
        error: 'Only Draft documents can be edited. Create a new version instead.' 
      }
    }

    // Update document
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        title: input.title || currentDoc.title,
        description: input.description !== undefined ? input.description : currentDoc.description,
        project_code: input.project_code !== undefined ? input.project_code : currentDoc.project_code
      })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Update document error:', updateError)
      return { success: false, error: 'Failed to update document' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      documentId,
      'updated',
      user.id,
      user.email || '',
      {
        changes: {
          title: input.title,
          description: input.description,
          project_code: input.project_code
        }
      }
    )

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      document,
      message: 'Document updated successfully' 
    }
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
      .select('*, document_files(file_path)')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Check ownership
    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to delete this document' }
    }

    // Check status - only Draft can be deleted
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
        // Continue anyway - database cascade will clean up records
      }
    }

    // Delete document (cascade will remove files and audit logs)
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

    // Get document to check ownership and status
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Check ownership
    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to release this document' }
    }

    // Check status - only Draft can be released
    if (document.status !== 'Draft') {
      return { 
        success: false, 
        error: 'Only Draft documents can be released' 
      }
    }

    // Production documents require approval workflow (Phase 5)
    // For now, just check is_production flag
    if (document.is_production) {
      return {
        success: false,
        error: 'Production documents require approval workflow (coming in Phase 5)'
      }
    }

    // Release document
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'Released',
        released_at: new Date().toISOString(),
        released_by: user.id
      })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Release document error:', updateError)
      return { success: false, error: 'Failed to release document' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      documentId,
      'released',
      user.id,
      user.email || '',
      {
        document_number: document.document_number,
        version: document.version
      }
    )

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      document: updatedDoc,
      message: `Document ${document.document_number}${document.version} released successfully` 
    }
  } catch (error: any) {
    console.error('Release document error:', error)
    return { success: false, error: error.message || 'Failed to release document' }
  }
}

// ==========================================
// Action: Get Documents List
// ==========================================

export interface GetDocumentsFilters {
  search?: string
  documentTypeId?: string
  status?: DocumentStatus
  projectCode?: string
  createdBy?: string
  page?: number
  pageSize?: number
}

export async function getDocuments(filters: GetDocumentsFilters = {}) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        document_type:document_types(id, name, prefix),
        creator:users!documents_created_by_fkey(id, email, full_name)
      `, { count: 'exact' })

    // Apply filters
    if (filters.search) {
      query = query.or(
        `document_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
      )
    }

    if (filters.documentTypeId) {
      query = query.eq('document_type_id', filters.documentTypeId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.projectCode) {
      query = query.eq('project_code', filters.projectCode)
    }

    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }

    // Apply pagination and sorting
    query = query
      .order('updated_at', { ascending: false })
      .range(from, to)

    const { data: documents, error: queryError, count } = await query

    if (queryError) {
      console.error('Get documents error:', queryError)
      return { success: false, error: 'Failed to get documents' }
    }

    return {
      success: true,
      documents: documents || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  } catch (error: any) {
    console.error('Get documents error:', error)
    return { success: false, error: error.message || 'Failed to get documents' }
  }
}
