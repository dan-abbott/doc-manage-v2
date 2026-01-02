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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Create document type attempted without authentication')
      return { success: false, error: 'Not authenticated' }
    }

    const userId = user.id

    // Get user's tenant_id and check admin status
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

    // Get form data
    const name = formData.get('name') as string
    const prefix = formData.get('prefix') as string
    const description = formData.get('description') as string

    if (!name || !prefix) {
      return { success: false, error: 'Name and prefix are required' }
    }

    // Validate prefix (uppercase, 2-10 chars, no spaces)
    const prefixUpper = prefix.toUpperCase()
    if (!/^[A-Z]{2,10}$/.test(prefixUpper)) {
      return { success: false, error: 'Prefix must be 2-10 uppercase letters with no spaces' }
    }

    // Check if prefix already exists in this tenant
    const { data: existing } = await supabase
      .from('document_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('prefix', prefixUpper)
      .single()

    if (existing) {
      return { success: false, error: 'A document type with this prefix already exists' }
    }

    // Create document type
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
      logger.error('Failed to create document type', { 
        userId, 
        error: insertError,
        name,
        prefix: prefixUpper,
      })
      return { success: false, error: 'Failed to create document type' }
    }

    logger.info('Document type created', { 
      userId, 
      documentTypeId: documentType.id,
      name,
      prefix: prefixUpper,
    })

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

    // Get user's tenant_id and check admin status
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

    // Verify document type belongs to this tenant
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
      .eq('tenant_id', tenantId) // Double-check tenant isolation

    if (updateError) {
      logger.error('Failed to update document type', { 
        userId, 
        documentTypeId,
        error: updateError 
      })
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

    // Get user's tenant_id and check admin status
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

    // Get current status and verify tenant
    const { data: docType } = await supabase
      .from('document_types')
      .select('is_active, tenant_id')
      .eq('id', documentTypeId)
      .single()

    if (!docType || docType.tenant_id !== tenantId) {
      return { success: false, error: 'Document type not found' }
    }

    // Toggle status
    const { error: updateError } = await supabase
      .from('document_types')
      .update({ is_active: !docType.is_active })
      .eq('id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('Failed to toggle document type status', { 
        userId, 
        documentTypeId,
        error: updateError 
      })
      return { success: false, error: 'Failed to toggle status' }
    }

    logger.info('Document type status toggled', { 
      userId, 
      documentTypeId, 
      newStatus: !docType.is_active 
    })

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

    // Get user's tenant_id and check admin status
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

    // Verify document type belongs to this tenant
    const { data: docType } = await supabase
      .from('document_types')
      .select('tenant_id')
      .eq('id', documentTypeId)
      .single()

    if (!docType || docType.tenant_id !== tenantId) {
      return { success: false, error: 'Document type not found' }
    }

    // Check if any documents use this type
    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('document_type_id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (count && count > 0) {
      return { 
        success: false, 
        error: 'Cannot delete document type that has documents. Deactivate it instead.' 
      }
    }

    // Delete the document type
    const { error: deleteError } = await supabase
      .from('document_types')
      .delete()
      .eq('id', documentTypeId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to delete document type', { 
        userId, 
        documentTypeId,
        error: deleteError 
      })
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
