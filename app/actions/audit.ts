'use server'

import { createClient } from '@/lib/supabase/server'

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
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    // Get audit log entries for this document
    const { data: auditLogs, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get audit log error:', error)
      return { success: false, error: 'Failed to fetch audit log', data: [] }
    }

    return { success: true, data: auditLogs || [] }
  } catch (error: any) {
    console.error('Get audit log error:', error)
    return { success: false, error: error.message || 'Failed to fetch audit log', data: [] }
  }
}
