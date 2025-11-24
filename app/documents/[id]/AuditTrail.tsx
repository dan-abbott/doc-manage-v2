import { getDocumentAuditLog } from '@/app/actions/audit'
import AuditTrailClient from './AuditTrailClient'

interface AuditTrailProps {
  documentId: string
}

export default async function AuditTrail({ documentId }: AuditTrailProps) {
  const result = await getDocumentAuditLog(documentId)

  if (!result.success || !result.data) {
    return null
  }

  return <AuditTrailClient auditLogs={result.data} />
}
