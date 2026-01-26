import { getDocumentAuditLog } from '@/app/actions/audit'
import AuditTrailClient from './AuditTrailClient'

interface AuditTrailProps {
  documentId: string
}

export default async function AuditTrail({ documentId }: AuditTrailProps) {
  console.log('[AuditTrail] Server component rendering for documentId:', documentId)
  const result = await getDocumentAuditLog(documentId)
  console.log('[AuditTrail] Audit log fetched, success:', result.success, 'entries:', result.data?.length)

  if (!result.success || !result.data) {
    return null
  }

  return <AuditTrailClient auditLogs={result.data} />
}
