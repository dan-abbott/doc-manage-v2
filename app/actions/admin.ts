'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Admin: Force delete any document regardless of status
 * Creates audit log entry before deletion
 */
export async function adminDeleteDocument(documentId: string) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Not authorized - admin only' }
    }

    // Get document info before deletion (for audit log)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Create audit log BEFORE deletion (critical for record keeping)
    await supabaseAdmin
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_delete',
        performed_by: user.id,
        performed_by_email: user.email,
        tenant_id: document.tenant_id,
        details: {
          document_number: `${document.document_number}${document.version}`,
          status: document.status,
          title: document.title,
          is_production: document.is_production,
          deleted_at: new Date().toISOString(),
        },
      })

    // Delete associated files from storage
    const { data: files } = await supabase
      .from('document_files')
      .select('file_path')
      .eq('document_id', documentId)

    if (files && files.length > 0) {
      const filePaths = files.map(f => f.file_path)
      await supabase.storage
        .from('documents')
        .remove(filePaths)
    }

    // Delete document (cascade will handle document_files and approvers)
    // Audit log will remain due to ON DELETE SET NULL on document_id
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Failed to delete document:', deleteError)
      return { success: false, error: 'Failed to delete document' }
    }

    revalidatePath('/documents')
    
    return { 
      success: true, 
      message: `Document ${document.document_number}${document.version} permanently deleted`
    }
  } catch (error) {
    console.error('Admin delete document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document',
    }
  }
}

/**
 * Admin: Change document owner
 */
export async function changeDocumentOwner(documentId: string, newOwnerEmail: string) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Not authorized - admin only' }
    }

    // Get new owner by email
    const { data: newOwner, error: ownerError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', newOwnerEmail.toLowerCase())
      .single()

    if (ownerError || !newOwner) {
      return { success: false, error: 'User not found with that email address' }
    }

    // Get current document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, document_number, version, created_by, tenant_id, users!documents_created_by_fkey(email)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Don't change if already the owner
    if (document.created_by === newOwner.id) {
      return { success: false, error: 'User is already the owner' }
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Update document owner
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ created_by: newOwner.id })
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to change document owner:', updateError)
      return { success: false, error: 'Failed to change owner' }
    }

    // Create audit log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        document_id: documentId,
        document_number: document.document_number,
        version: document.version,
        action: 'admin_change_owner',
        performed_by: user.id,
        performed_by_email: user.email,
        tenant_id: document.tenant_id,
        details: {
          document_number: `${document.document_number}${document.version}`,
          old_owner: (document.users as any)?.email || 'unknown',
          new_owner: newOwner.email,
        },
      })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return { success: true }
  } catch (error) {
    console.error('Admin change owner error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change owner',
    }
  }
}

/**
 * Admin: Rename document number
 */
export async function adminRenameDocument(documentId: string, newNumber: string) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Not authorized - admin only' }
    }

    // Validate new number format (PREFIX-#####)
    const numberPattern = /^[A-Z]+-\d{5}$/
    if (!numberPattern.test(newNumber)) {
      return { success: false, error: 'Invalid document number format. Use PREFIX-##### (e.g., FORM-00001)' }
    }

    // Get current document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('document_number, version, tenant_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Check if new number already exists
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('document_number', newNumber)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: `Document number ${newNumber} already exists` }
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Update document number
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ document_number: newNumber })
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to rename document:', updateError)
      return { success: false, error: 'Failed to rename document' }
    }

    // Create audit log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_rename',
        performed_by: user.id,
        performed_by_email: user.email,
        tenant_id: document.tenant_id,
        details: {
          old_number: `${document.document_number}${document.version}`,
          new_number: `${newNumber}${document.version}`,
        },
      })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return { success: true }
  } catch (error) {
    console.error('Admin rename document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename document',
    }
  }
}
