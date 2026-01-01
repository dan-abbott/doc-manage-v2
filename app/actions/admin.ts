// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger, logServerAction, logError } from '@/lib/logger'
import { uuidSchema } from '@/lib/validation/schemas'

/**
 * Admin-only: Force delete any document regardless of status
 * Creates audit log before deletion to preserve record
 * Deletes associated files, approvers, and audit logs
 */
export async function adminDeleteDocument(documentId: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(documentId)
    if (!idValidation.success) {
      logger.warn('Invalid document ID for admin deletion', { providedId: documentId })
      return { success: false, error: 'Invalid document ID' }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized admin deletion attempt', { error: userError?.message })
      return { 
        success: false, 
        error: 'You must be logged in to delete documents' 
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
      logger.warn('Non-admin attempted force delete', { 
        userId, 
        userEmail,
        documentId,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can force delete documents' 
      }
    }

    logger.info('Admin force delete initiated', {
      userId,
      userEmail,
      documentId
    })


    // Get document details before deletion (for logging)
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select(`
        id,
        document_number,
        version,
        title,
        status,
        is_production,
        created_by,
        created_at,
        document_type_id,
        document_type:document_types(name, prefix)
      `)
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      logger.error('Document not found for admin deletion', {
        userId,
        userEmail,
        documentId,
        error: fetchError
      })
      return { 
        success: false, 
        error: 'Document not found' 
      }
    }

    // TypeScript workaround: document_type comes as single object but TS infers as array
    const documentType = Array.isArray(document.document_type) 
      ? document.document_type[0] 
      : document.document_type

    if (fetchError || !document) {
      logger.error('Document not found for admin deletion', {
        userId,
        userEmail,
        documentId,
        error: fetchError
      })
      return { 
        success: false, 
        error: 'Document not found' 
      }
    }

    // Get file count for logging
    const { data: files, error: filesError } = await supabase
      .from('document_files')
      .select('id, file_name, file_path')
      .eq('document_id', documentId)

    const fileCount = files?.length || 0

    // Get approver count for logging
    const { data: approvers, error: approversError } = await supabase
      .from('approvers')
      .select('id')
      .eq('document_id', documentId)

    const approverCount = approvers?.length || 0

    logger.info('Document deletion details', {
      userId,
      userEmail,
      documentId,
      documentNumber: document.document_number,
      version: document.version,
      status: document.status,
      fileCount,
      approverCount
    })

    // Create comprehensive audit log BEFORE deletion
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_force_delete',
        performed_by: userId,
        performed_by_email: userEmail || '',
        details: {
          document_number: document.document_number,
          version: document.version,
          title: document.title,
          status: document.status,
          is_production: document.is_production,
          document_type: documentType?.name,
          original_creator: document.created_by,
          created_at: document.created_at,
          file_count: fileCount,
          approver_count: approverCount,
          deletion_reason: 'Admin force delete',
          deleted_at: new Date().toISOString()
        }
      })

    if (auditError) {
      logger.error('Failed to create deletion audit log', {
        userId,
        documentId,
        error: auditError
      })
      // Don't proceed without audit trail
      return {
        success: false,
        error: 'Failed to create audit trail. Deletion aborted for safety.'
      }
    }

    // Delete associated files from storage
    if (files && files.length > 0) {
      for (const file of files) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([file.file_path])

        if (storageError) {
          logger.warn('Failed to delete file from storage', {
            documentId,
            fileName: file.file_name,
            filePath: file.file_path,
            error: storageError
          })
          // Continue with deletion even if storage fails
        }
      }
    }

    // Delete document_files records
    const { error: filesDeleteError } = await supabase
      .from('document_files')
      .delete()
      .eq('document_id', documentId)

    if (filesDeleteError) {
      logger.error('Failed to delete document files', {
        documentId,
        error: filesDeleteError
      })
      throw filesDeleteError
    }

    // Delete approvers records
    const { error: approversDeleteError } = await supabase
      .from('approvers')
      .delete()
      .eq('document_id', documentId)

    if (approversDeleteError) {
      logger.error('Failed to delete approvers', {
        documentId,
        error: approversDeleteError
      })
      throw approversDeleteError
    }

    // Finally, delete the document itself
    const { error: documentDeleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (documentDeleteError) {
      logger.error('Failed to delete document', {
        documentId,
        error: documentDeleteError
      })
      throw documentDeleteError
    }

    const duration = Date.now() - startTime
    
    logger.warn('Document force deleted by admin', {
      userId,
      userEmail,
      documentId,
      documentNumber: document.document_number,
      version: document.version,
      status: document.status,
      filesDeleted: fileCount,
      approversDeleted: approverCount,
      duration
    })

    logServerAction('adminDeleteDocument', {
      userId,
      userEmail,
      documentId,
      documentNumber: document.document_number,
      version: document.version,
      status: document.status,
      duration,
      success: true
    })

    revalidatePath('/documents')
    revalidatePath('/dashboard')
    
    return { 
      success: true,
      message: `Document ${document.document_number}${document.version} deleted successfully`
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'adminDeleteDocument',
      documentId,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document' 
    }
  }
}
export async function changeDocumentOwner(documentId: string, newOwnerEmail: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Get current user (must be admin)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized change owner attempt')
      return { success: false, error: 'You must be logged in' }
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
      logger.warn('Non-admin attempted to change document owner', { 
        userId, 
        userEmail,
        documentId 
      })
      return { success: false, error: 'Only administrators can change document owners' }
    }
    
    logger.info('Changing document owner', {
      userId,
      userEmail,
      documentId,
      newOwnerEmail
    })
    
    // Find new owner by email
    const { data: newOwner, error: ownerError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', newOwnerEmail)
      .single()
    
    if (ownerError || !newOwner) {
      logger.warn('New owner not found', {
        userId,
        documentId,
        newOwnerEmail,
        error: ownerError
      })
      return { success: false, error: 'User not found with that email address' }
    }
    
    // Get document details before change
    const { data: document } = await supabase
      .from('documents')
      .select('document_number, version, created_by')
      .eq('id', documentId)
      .single()
    
    // Update document owner
    const { error: updateError } = await supabase
      .from('documents')
      .update({ created_by: newOwner.id })
      .eq('id', documentId)
    
    if (updateError) {
      logger.error('Failed to change document owner', {
        userId,
        documentId,
        error: updateError
      })
      return { success: false, error: updateError.message }
    }
    
    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'owner_changed',
        performed_by: userId,
        performed_by_email: userEmail || '',
        details: {
          old_owner_id: document?.created_by,
          new_owner_id: newOwner.id,
          new_owner_email: newOwner.email,
          changed_by_admin: true
        }
      })
    
    if (auditError) {
      logger.error('Failed to create audit log for owner change', {
        userId,
        documentId,
        error: auditError
      })
      // Don't fail the operation
    }
    
    const duration = Date.now() - startTime
    
    logger.info('Document owner changed successfully', {
      userId,
      userEmail,
      documentId,
      documentNumber: document?.document_number,
      newOwnerId: newOwner.id,
      newOwnerEmail: newOwner.email,
      duration
    })
    
    logServerAction('changeDocumentOwner', {
      userId,
      userEmail,
      documentId,
      newOwnerEmail: newOwner.email,
      duration,
      success: true
    })
    
    return { success: true, newOwnerEmail: newOwner.email }
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'changeDocumentOwner',
      documentId,
      newOwnerEmail,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to change document owner' 
    }
  }
}
