'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { logError, logServerAction } from '@/lib/utils/logging-helpers'

// ==========================================
// Types
// ==========================================

export interface AuditLogEntry {
  id: string
  document_id: string
  action: string
  performed_by: string
  performed_by_email: string
  details: any
  created_at: string
}

// ==========================================
// Action: Get Audit Logs for Document
// ==========================================

export async function getDocumentAuditLog(documentId: string) {
  const startTime = Date.now()
  let userId: string | undefined
  
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Audit log access attempted without authentication', { documentId })
      return { success: false, error: 'Not authenticated', data: [] }
    }

    userId = user.id
    logger.debug('Fetching audit log', { userId, documentId, action: 'getDocumentAuditLog' })

    // Get audit log entries for this document
    const { data: auditLogs, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      logError(error, {
        action: 'getDocumentAuditLog',
        userId,
        documentId,
        duration: Date.now() - startTime
      })
      return { success: false, error: 'Failed to fetch audit log', data: [] }
    }

    logServerAction('getDocumentAuditLog', {
      userId,
      documentId,
      success: true,
      duration: Date.now() - startTime,
      entryCount: auditLogs?.length || 0
    })

    return { success: true, data: auditLogs || [] }
  } catch (error: any) {
    logError(error, {
      action: 'getDocumentAuditLog',
      userId,
      documentId,
      duration: Date.now() - startTime
    })
    return { success: false, error: error.message || 'Failed to fetch audit log', data: [] }
  }
}
