/**
 * Comprehensive Audit Log Helper
 * Handles all audit logging across the application with proper error handling
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface BaseAuditParams {
  action: string
  performedBy: string
  performedByEmail: string
  tenantId: string
  details?: Record<string, any>
}

interface DocumentAuditParams extends BaseAuditParams {
  documentId: string
}

/**
 * Create an audit log entry for document-related actions
 */
export async function createDocumentAudit(params: DocumentAuditParams) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('audit_log')
      .insert({
        document_id: params.documentId,
        action: params.action,
        performed_by: params.performedBy,
        performed_by_email: params.performedByEmail,
        tenant_id: params.tenantId,
        details: params.details || {}
      })
    
    if (error) {
      logger.error('Failed to create audit log', {
        action: params.action,
        documentId: params.documentId,
        error: error.message
      })
      // Don't throw - audit failure shouldn't break the main operation
      return { success: false, error }
    }
    
    return { success: true }
  } catch (error) {
    logger.error('Unexpected error creating audit log', {
      action: params.action,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return { success: false, error }
  }
}

/**
 * Audit log action types - for type safety and consistency
 */
export const AuditAction = {
  // Document lifecycle
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'document_deleted',
  
  // Files
  FILE_UPLOADED: 'file_uploaded',
  FILE_DELETED: 'file_deleted',
  FILE_SCAN_COMPLETED: 'file_scan_completed',
  FILE_SCAN_FAILED: 'file_scan_failed',
  
  // Approval workflow
  SUBMITTED_FOR_APPROVAL: 'submitted_for_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  
  // Versioning
  VERSION_CREATED: 'version_created',
  DOCUMENT_OBSOLETED: 'document_obsoleted',
  PROMOTED_TO_PRODUCTION: 'promoted_to_production',
  
  // Approvers
  APPROVER_ADDED: 'approver_added',
  APPROVER_REMOVED: 'approver_removed',
  APPROVER_CHANGED: 'approver_changed',
  
  // Admin actions
  OWNER_CHANGED: 'owner_changed',
  DOCUMENT_TYPE_COUNTER_RESET: 'document_type_counter_reset',
  SETTINGS_UPDATED: 'settings_updated',
} as const

/**
 * Helper function to safely log audit without throwing errors
 * Use this for background/fire-and-forget audit logging
 */
export async function safeAuditLog(params: DocumentAuditParams): Promise<void> {
  try {
    await createDocumentAudit(params)
  } catch (error) {
    // Silently log error - don't let audit failure break the app
    logger.warn('Audit log failed but continuing', {
      action: params.action,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Batch audit logging for multiple actions
 * Useful for operations that generate multiple audit entries
 */
export async function createBatchAudit(entries: DocumentAuditParams[]) {
  try {
    const supabase = await createClient()
    
    const records = entries.map(entry => ({
      document_id: entry.documentId,
      action: entry.action,
      performed_by: entry.performedBy,
      performed_by_email: entry.performedByEmail,
      tenant_id: entry.tenantId,
      details: entry.details || {}
    }))
    
    const { error } = await supabase
      .from('audit_log')
      .insert(records)
    
    if (error) {
      logger.error('Failed to create batch audit logs', {
        count: entries.length,
        error: error.message
      })
      return { success: false, error }
    }
    
    return { success: true }
  } catch (error) {
    logger.error('Unexpected error creating batch audit logs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return { success: false, error }
  }
}
