import AuditTrailClient from './AuditTrailClient'
import type { AuditLogEntry } from '@/app/actions/audit'

interface AuditTrailProps {
  auditLogs: AuditLogEntry[]
}

export default function AuditTrail({ auditLogs }: AuditTrailProps) {
  console.log('[AuditTrail] Rendering with', auditLogs.length, 'entries')
  return <AuditTrailClient auditLogs={auditLogs} />
}
