/**
 * Audit Log Helper
 * Centralized function for creating audit log entries with consistent structure
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

interface CreateAuditLogParams {
  documentId: string
  documentNumber: string
  version: string
  action: string
  performedBy: string
  performedByEmail: string
  tenantId: string
  details?: Record<string, any>
}

/**
 * Create an audit log entry with document tracking
 * Includes document_number and version for permanent record keeping
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const supabaseAdmin = createServiceRoleClient()
  
  const { error } = await supabaseAdmin
    .from('audit_log')
    .insert({
      document_id: params.documentId,
      document_number: params.documentNumber,
      version: params.version,
      action: params.action,
      performed_by: params.performedBy,
      performed_by_email: params.performedByEmail,
      tenant_id: params.tenantId,
      details: {
        ...params.details,
        // Always include full document identifier in details for redundancy
        document_number: `${params.documentNumber}${params.version}`,
      }
    })
  
  if (error) {
    console.error('Failed to create audit log:', error)
  }
  
  return { error }
}
