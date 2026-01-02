'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

// ==========================================
// Document Type Management
// ==========================================

export async function createDocumentType(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Create document type attempted without authentication')
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      logger.error('User has no tenant_id', { userId })
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      logger.warn('Non-admin attempted to create document type', { userId })
      return { success: false, error: 'Only administrators can create document types' }
    }

    const name = formData.get('name') as string
    const prefix = formData.get('prefix') as string
    const description = formData.get('description') as string

    if (!name || !prefix) {
      return { success: false, error: 'Name and prefix are required' }
    }

    const prefixUpper = prefix.toUpperCase()
    if (!/^[A-Z]{2,10}$/.test(prefixUpper)) {
      return { success: false, error: 'Prefix must be 2-10 uppercase letters with no spaces' }
    }

    const { data: existing } = await supabase
      .from('document_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('prefix', prefixUpper)
      .single()

    if (existing) {
      return { success: false, error: 'A document type with this prefix already exists' }
    }

    const { data: documentType, error: insertError } = await supabase
      .from('document_types')
      .insert({
        name,
        prefix: prefixUpper,
        description: description || null,
        is_active: true,
        next_number: 1,
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create document type', { userId, error: insertError, name, prefix: prefixUpper })
      return { success: false, error: 'Failed to create document type' }
    }

    logger.info('Document type created', { userId, documentTypeId: documentType.id, name, prefix: prefixUpper })

    revalidatePath('/admin/document-types')
    revalidatePath('/documents/new')

    return { success: true, data: documentType }
  } catch (error) {
    logger.error('Unexpected error creating document type', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updateDocumentType(documentTypeId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      return { success: false, error: 'Only administrators can update document types' }
    }

    const { data: docType } = await supabase
      .from('document_types')
      .select('tenant_id')
      .eq('id', documentTypeId)
      .single()

    if (!docType || docType.tenant_id !== tenantId) {
      return { success: false, error: 'Document type not found' }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string

    if (!name) {
      return { success: false, error: 'Name is required' }
    }

    const { error: updateError } = await supabase
      .from('document_types')
      .update({
        name,
        description: description || null,
      })
      .eq('id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('Failed to update document type', { userId, documentTypeId, error: updateError })
      return { success: false, error: 'Failed to update document type' }
    }

    logger.info('Document type updated', { userId, documentTypeId })

    revalidatePath('/admin/document-types')
    return { success: true }
  } catch (error) {
    logger.error('Unexpected error updating document type', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function toggleDocumentTypeStatus(documentTypeId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      return { success: false, error: 'Only administrators can toggle document types' }
    }

    const { data: docType } = await supabase
      .from('document_types')
      .select('is_active, tenant_id')
      .eq('id', documentTypeId)
      .single()

    if (!docType || docType.tenant_id !== tenantId) {
      return { success: false, error: 'Document type not found' }
    }

    const { error: updateError } = await supabase
      .from('document_types')
      .update({ is_active: !docType.is_active })
      .eq('id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('Failed to toggle document type status', { userId, documentTypeId, error: updateError })
      return { success: false, error: 'Failed to toggle status' }
    }

    logger.info('Document type status toggled', { userId, documentTypeId, newStatus: !docType.is_active })

    revalidatePath('/admin/document-types')
    revalidatePath('/documents/new')

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error toggling document type', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function deleteDocumentType(documentTypeId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      return { success: false, error: 'Only administrators can delete document types' }
    }

    const { data: docType } = await supabase
      .from('document_types')
      .select('tenant_id')
      .eq('id', documentTypeId)
      .single()

    if (!docType || docType.tenant_id !== tenantId) {
      return { success: false, error: 'Document type not found' }
    }

    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('document_type_id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (count && count > 0) {
      return { success: false, error: 'Cannot delete document type that has documents. Deactivate it instead.' }
    }

    const { error: deleteError } = await supabase
      .from('document_types')
      .delete()
      .eq('id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to delete document type', { userId, documentTypeId, error: deleteError })
      return { success: false, error: 'Failed to delete document type' }
    }

    logger.info('Document type deleted', { userId, documentTypeId })

    revalidatePath('/admin/document-types')
    revalidatePath('/documents/new')

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error deleting document type', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ==========================================
// Admin Document Management
// ==========================================

export async function adminDeleteDocument(documentId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      logger.warn('Non-admin attempted admin delete', { userId, documentId })
      return { success: false, error: 'Only administrators can use this function' }
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, document_number, version, tenant_id')
      .eq('id', documentId)
      .single()

    if (!document || document.tenant_id !== tenantId) {
      return { success: false, error: 'Document not found' }
    }

    const { data: files } = await supabase
      .from('document_files')
      .select('file_path')
      .eq('document_id', documentId)

    if (files && files.length > 0) {
      const filePaths = files.map(f => f.file_path)
      await supabase.storage.from('documents').remove(filePaths)
    }

    await supabase.from('document_files').delete().eq('document_id', documentId)
    await supabase.from('approvers').delete().eq('document_id', documentId)

    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_deleted',
        performed_by: userId,
        performed_by_email: user.email || '',
        tenant_id: tenantId,
        details: {
          document_number: document.document_number,
          version: document.version,
          reason: 'Admin force delete',
        },
      })

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to delete document', { userId, documentId, error: deleteError })
      return { success: false, error: 'Failed to delete document' }
    }

    logger.info('Admin deleted document', { userId, documentId, documentNumber: document.document_number, version: document.version })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return { success: true }
  } catch (error) {
    logger.error('Unexpected error in admin delete', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function changeDocumentOwner(documentId: string, newOwnerEmail: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', userId)
      .single()

    const tenantId = userData?.tenant_id
    const isAdmin = userData?.is_admin

    if (!tenantId) {
      return { success: false, error: 'User not associated with a tenant' }
    }

    if (!isAdmin) {
      logger.warn('Non-admin attempted to change owner', { userId, documentId })
      return { success: false, error: 'Only administrators can change document ownership' }
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, created_by, tenant_id, document_number, version')
      .eq('id', documentId)
      .single()

    if (!document || document.tenant_id !== tenantId) {
      return { success: false, error: 'Document not found' }
    }

    const { data: newOwner } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', newOwnerEmail.toLowerCase())
      .eq('tenant_id', tenantId)
      .single()

    if (!newOwner) {
      return { success: false, error: 'User not found in this organization. They must sign in first.' }
    }

    if (newOwner.id === document.created_by) {
      return { success: false, error: 'User is already the owner' }
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({ created_by: newOwner.id })
      .eq('id', documentId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('Failed to change document owner', { userId, documentId, error: updateError })
      return { success: false, error: 'Failed to change owner' }
    }

    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'owner_changed',
        performed_by: userId,
        performed_by_email: user.email || '',
        tenant_id: tenantId,
        details: {
          previous_owner: document.created_by,
          new_owner: newOwner.id,
          new_owner_email: newOwner.email,
        },
      })

    logger.info('Document owner changed', { userId, documentId, newOwnerId: newOwner.id, newOwnerEmail: newOwner.email })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return { success: true, newOwnerEmail: newOwner.email }
  } catch (error) {
    logger.error('Unexpected error changing owner', { error })
    return { success: false, error: 'An unexpected error occurred' }
  }
}
