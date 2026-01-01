// app/actions/document-types.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger, logServerAction, logError, logDatabaseQuery } from '@/lib/logger'
import { sanitizeString } from '@/lib/security/sanitize'
import { 
  documentTypeCreateSchema, 
  documentTypeUpdateSchema,
  uuidSchema 
} from '@/lib/validation/schemas'

/**
 * Create a new document type
 * Admin only - creates new document type with validation
 */
export async function createDocumentType(formData: FormData) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized document type creation attempt', { error: userError?.message })
      return { 
        success: false, 
        error: 'You must be logged in to create document types' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    // Check admin status
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (adminCheckError || !userData?.is_admin) {
      logger.warn('Non-admin attempted document type creation', { 
        userId, 
        userEmail,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can create document types' 
      }
    }

    // Extract and validate form data
    const rawData = {
      name: formData.get('name'),
      prefix: formData.get('prefix'),
      description: formData.get('description'),
      is_active: formData.get('is_active') === 'true'
    }

    const validation = documentTypeCreateSchema.safeParse(rawData)
    
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(i => i.message).join(', ')
      logger.warn('Document type creation validation failed', { 
        userId, 
        userEmail,
        errors: validation.error.issues,
        rawData: { ...rawData, description: rawData.description ? '[PROVIDED]' : null }
      })
      return { 
        success: false, 
        error: errorMessage 
      }
    }

    const validatedData = validation.data

    // Sanitize text inputs
    const sanitizedData = {
      name: sanitizeString(validatedData.name),
      prefix: validatedData.prefix.toUpperCase(), // Already validated as uppercase letters
      description: validatedData.description ? sanitizeString(validatedData.description) : null,
      is_active: validatedData.is_active
    }

    logger.info('Creating document type', {
      userId,
      userEmail,
      documentType: sanitizedData.name,
      prefix: sanitizedData.prefix
    })

    // Check for duplicate prefix
    const { data: existingType, error: checkError } = await supabase
      .from('document_types')
      .select('id, prefix')
      .eq('prefix', sanitizedData.prefix)
      .maybeSingle()

    if (checkError) {
      logger.error('Database error checking for duplicate prefix', {
        userId,
        prefix: sanitizedData.prefix,
        error: checkError
      })
      throw checkError
    }

    if (existingType) {
      logger.warn('Duplicate prefix attempted', {
        userId,
        userEmail,
        prefix: sanitizedData.prefix,
        existingTypeId: existingType.id
      })
      return { 
        success: false, 
        error: `Prefix "${sanitizedData.prefix}" is already in use` 
      }
    }

    // Insert new document type
    const { data: newType, error: insertError } = await supabase
      .from('document_types')
      .insert({
        name: sanitizedData.name,
        prefix: sanitizedData.prefix,
        description: sanitizedData.description,
        is_active: sanitizedData.is_active,
        next_number: 1 // Start sequential numbering at 1
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to insert document type', {
        userId,
        userEmail,
        error: insertError,
        data: sanitizedData
      })
      throw insertError
    }

    const duration = Date.now() - startTime
    
    logger.info('Document type created successfully', {
      userId,
      userEmail,
      documentTypeId: newType.id,
      name: newType.name,
      prefix: newType.prefix,
      duration
    })

    logServerAction('createDocumentType', {
      userId,
      userEmail,
      documentTypeId: newType.id,
      prefix: newType.prefix,
      duration,
      success: true
    })

    revalidatePath('/document-types')
    
    return { 
      success: true, 
      data: newType 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'createDocumentType',
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create document type' 
    }
  }
}

/**
 * Update an existing document type
 * Admin only - updates document type with validation
 */
export async function updateDocumentType(id: string, formData: FormData) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(id)
    if (!idValidation.success) {
      logger.warn('Invalid document type ID for update', { providedId: id })
      return { success: false, error: 'Invalid document type ID' }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized document type update attempt', { error: userError?.message })
      return { 
        success: false, 
        error: 'You must be logged in to update document types' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    // Check admin status
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (adminCheckError || !userData?.is_admin) {
      logger.warn('Non-admin attempted document type update', { 
        userId, 
        userEmail,
        documentTypeId: id,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can update document types' 
      }
    }

    // Extract and validate form data
    const rawData = {
      name: formData.get('name'),
      description: formData.get('description'),
      is_active: formData.get('is_active') === 'true'
    }

    const validation = documentTypeUpdateSchema.safeParse(rawData)
    
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(i => i.message).join(', ')
      logger.warn('Document type update validation failed', { 
        userId,
        userEmail,
        documentTypeId: id,
        errors: validation.error.issues
      })
      return { 
        success: false, 
        error: errorMessage 
      }
    }

    const validatedData = validation.data

    // Sanitize text inputs
    const sanitizedData = {
      name: sanitizeString(validatedData.name),
      description: validatedData.description ? sanitizeString(validatedData.description) : null,
      is_active: validatedData.is_active
    }

    logger.info('Updating document type', {
      userId,
      userEmail,
      documentTypeId: id,
      updates: sanitizedData
    })

    // Get current document type to check for documents
    const { data: currentType, error: fetchError } = await supabase
      .from('document_types')
      .select('prefix, name')
      .eq('id', id)
      .single()

    if (fetchError || !currentType) {
      logger.error('Document type not found for update', {
        userId,
        documentTypeId: id,
        error: fetchError
      })
      return { 
        success: false, 
        error: 'Document type not found' 
      }
    }

    // Update document type
    const { data: updatedType, error: updateError } = await supabase
      .from('document_types')
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update document type', {
        userId,
        userEmail,
        documentTypeId: id,
        error: updateError
      })
      throw updateError
    }

    const duration = Date.now() - startTime
    
    logger.info('Document type updated successfully', {
      userId,
      userEmail,
      documentTypeId: id,
      name: updatedType.name,
      changes: sanitizedData,
      duration
    })

    logServerAction('updateDocumentType', {
      userId,
      userEmail,
      documentTypeId: id,
      duration,
      success: true
    })

    revalidatePath('/document-types')
    
    return { 
      success: true, 
      data: updatedType 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'updateDocumentType',
      documentTypeId: id,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update document type' 
    }
  }
}

/**
 * Delete a document type
 * Admin only - can only delete if no documents use this type
 */
export async function deleteDocumentType(id: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(id)
    if (!idValidation.success) {
      logger.warn('Invalid document type ID for deletion', { providedId: id })
      return { success: false, error: 'Invalid document type ID' }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized document type deletion attempt', { error: userError?.message })
      return { 
        success: false, 
        error: 'You must be logged in to delete document types' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    // Check admin status
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (adminCheckError || !userData?.is_admin) {
      logger.warn('Non-admin attempted document type deletion', { 
        userId,
        userEmail,
        documentTypeId: id,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can delete document types' 
      }
    }

    logger.info('Attempting document type deletion', {
      userId,
      userEmail,
      documentTypeId: id
    })

    // Check if any documents use this type
    const { data: documents, error: checkError } = await supabase
      .from('documents')
      .select('id')
      .eq('document_type_id', id)
      .limit(1)

    if (checkError) {
      logger.error('Error checking for documents using type', {
        userId,
        documentTypeId: id,
        error: checkError
      })
      throw checkError
    }

    if (documents && documents.length > 0) {
      logger.warn('Cannot delete document type with existing documents', {
        userId,
        userEmail,
        documentTypeId: id,
        documentCount: documents.length
      })
      return { 
        success: false, 
        error: 'Cannot delete document type that has documents. Please deactivate it instead.' 
      }
    }

    // Get document type info before deletion for logging
    const { data: typeToDelete } = await supabase
      .from('document_types')
      .select('name, prefix')
      .eq('id', id)
      .single()

    // Delete document type
    const { error: deleteError } = await supabase
      .from('document_types')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Failed to delete document type', {
        userId,
        userEmail,
        documentTypeId: id,
        error: deleteError
      })
      throw deleteError
    }

    const duration = Date.now() - startTime
    
    logger.info('Document type deleted successfully', {
      userId,
      userEmail,
      documentTypeId: id,
      name: typeToDelete?.name,
      prefix: typeToDelete?.prefix,
      duration
    })

    logServerAction('deleteDocumentType', {
      userId,
      userEmail,
      documentTypeId: id,
      name: typeToDelete?.name,
      prefix: typeToDelete?.prefix,
      duration,
      success: true
    })

    revalidatePath('/document-types')
    
    return { success: true }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'deleteDocumentType',
      documentTypeId: id,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document type' 
    }
  }
}

/**
 * Toggle document type active status
 * Admin only - quick action to activate/deactivate types
 */
export async function toggleDocumentTypeStatus(id: string, isActive: boolean) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate inputs
    const idValidation = uuidSchema.safeParse(id)
    if (!idValidation.success) {
      logger.warn('Invalid document type ID for status toggle', { providedId: id })
      return { success: false, error: 'Invalid document type ID' }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized status toggle attempt', { error: userError?.message })
      return { 
        success: false, 
        error: 'You must be logged in to modify document types' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    // Check admin status
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (adminCheckError || !userData?.is_admin) {
      logger.warn('Non-admin attempted status toggle', { 
        userId,
        userEmail,
        documentTypeId: id,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can modify document types' 
      }
    }

    logger.info('Toggling document type status', {
      userId,
      userEmail,
      documentTypeId: id,
      newStatus: isActive ? 'active' : 'inactive'
    })

    // Get current document type info
    const { data: currentType } = await supabase
      .from('document_types')
      .select('name, prefix, is_active')
      .eq('id', id)
      .single()

    // Update status
    const { data: updatedType, error: updateError } = await supabase
      .from('document_types')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to toggle document type status', {
        userId,
        userEmail,
        documentTypeId: id,
        error: updateError
      })
      throw updateError
    }

    const duration = Date.now() - startTime
    
    logger.info('Document type status toggled successfully', {
      userId,
      userEmail,
      documentTypeId: id,
      name: updatedType.name,
      prefix: updatedType.prefix,
      previousStatus: currentType?.is_active,
      newStatus: isActive,
      duration
    })

    logServerAction('toggleDocumentTypeStatus', {
      userId,
      userEmail,
      documentTypeId: id,
      newStatus: isActive ? 'active' : 'inactive',
      duration,
      success: true
    })

    revalidatePath('/document-types')
    
    return { 
      success: true, 
      data: updatedType 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'toggleDocumentTypeStatus',
      documentTypeId: id,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle status' 
    }
  }
}

/**
 * Get a single document type by ID
 */
export async function getDocumentType(id: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      logger.error('Failed to fetch document type', { id, error })
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    logger.error('Error in getDocumentType', { id, error })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch document type' 
    }
  }
}

/**
 * Get all document types
 * @param activeOnly - If true, only return active types. If false, return all.
 */
export async function getDocumentTypes(activeOnly: boolean = true) {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('document_types')
      .select('*')
      .order('name')
    
    // Filter by active status if requested
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      logger.error('Failed to fetch document types', { activeOnly, error })
      return { success: false, error: error.message, data: [] }
    }
    
    return { success: true, data: data || [] }
  } catch (error) {
    logger.error('Error in getDocumentTypes', { activeOnly, error })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch document types',
      data: []
    }
  }
}
