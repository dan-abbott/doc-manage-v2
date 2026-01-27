'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { DocumentVersionsData } from '@/lib/document-helpers'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import ReleaseDocumentButton from './components/ReleaseDocumentButton'
import SubmitForApprovalButton from './components/SubmitForApprovalButton'
import DeleteDocumentButton from './components/DeleteDocumentButton'
import CreateNewVersionButton from './components/CreateNewVersionButton'
import PromoteToProductionButton from './components/PromoteToProductionButton'

// Dynamically import components
const ApprovalWorkflow = dynamic(() => import('./components/ApprovalWorkflow'), { ssr: false })
const ApproverManagement = dynamic(() => import('./components/ApproverManagement'), { ssr: false })
const AuditTrail = dynamic(() => import('./components/AuditTrail'), { ssr: false })
const AdminActions = dynamic(() => import('./components/AdminActions'), { ssr: false })

interface DocumentActionsPanelProps {
  documentData: DocumentVersionsData
  auditLogs: any[]
  availableUsers: any[]
  isAdmin: boolean
  currentUserId: string
  currentUserEmail: string
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  sectionKey: string
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  'Released': 'bg-green-500',
  'Obsolete': 'bg-gray-700',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function CollapsibleSection({ title, children, defaultOpen = false, sectionKey }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return (
    <Card key={sectionKey}>
      <button
        onClick={toggle}
        className="w-full text-left"
        type="button"
      >
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </CardHeader>
      </button>
      {isOpen && mounted && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

export default function DocumentActionsPanel({
  documentData,
  auditLogs,
  availableUsers,
  isAdmin,
  currentUserId,
  currentUserEmail
}: DocumentActionsPanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { latestReleased, wipVersions, allVersions, documentNumber } = documentData

  // Use latest released for primary actions, or first WIP if no released version
  const primaryDocument = latestReleased || wipVersions[0]
  
  if (!primaryDocument) {
    return <div className="p-6 text-center text-gray-500">No document data available</div>
  }

  const isCreator = primaryDocument.created_by === currentUserId
  const approvers = primaryDocument.approvers || []
  const hasApprovers = approvers.length > 0
  
  // Determine button visibility
  const canEdit = (isCreator || isAdmin) && primaryDocument.status === 'Draft'
  const canDelete = (isCreator || isAdmin) && primaryDocument.status === 'Draft'
  
  const canRelease = 
    (isCreator || isAdmin) && 
    primaryDocument.status === 'Draft' && 
    !primaryDocument.is_production &&
    !hasApprovers

  const canSubmitForApproval = 
    (isCreator || isAdmin) && 
    primaryDocument.status === 'Draft' && 
    hasApprovers

  const canCreateNewVersion = 
    (isCreator || isAdmin) && 
    latestReleased && 
    latestReleased.status === 'Released'

  const canPromoteToProduction = 
    (isCreator || isAdmin) && 
    latestReleased &&
    latestReleased.status === 'Released' && 
    !latestReleased.is_production

  const userIsApprover = approvers.some((a: any) => a.user_email === currentUserEmail)
  const userPendingApproval = approvers.some(
    (a: any) => a.user_email === currentUserEmail && a.status === 'Pending'
  )

  return (
    <div className="p-6 space-y-4">
      {/* Primary Actions */}
      <CollapsibleSection title="Primary Actions" defaultOpen={true} sectionKey="primary">
        <div className="space-y-2">
          {canEdit && (
            <Button asChild className="w-full">
              <Link href={`/documents/${primaryDocument.id}/edit`}>
                Edit Document
              </Link>
            </Button>
          )}

          {canRelease && (
            <ReleaseDocumentButton 
              documentId={primaryDocument.id} 
              isProduction={primaryDocument.is_production}
            />
          )}

          {canSubmitForApproval && (
            <SubmitForApprovalButton 
              documentId={primaryDocument.id}
              documentNumber={primaryDocument.document_number}
              approverCount={approvers.length}
            />
          )}

          {canCreateNewVersion && (
            <CreateNewVersionButton
              documentId={latestReleased.id}
              documentNumber={latestReleased.document_number}
              version={latestReleased.version}
              isProduction={latestReleased.is_production}
            />
          )}

          {canPromoteToProduction && (
            <PromoteToProductionButton
              documentId={latestReleased.id}
              documentNumber={latestReleased.document_number}
              version={latestReleased.version}
            />
          )}

          {canDelete && (
            <DeleteDocumentButton documentId={primaryDocument.id} />
          )}

          {!canEdit && !canRelease && !canSubmitForApproval && !canCreateNewVersion && !canPromoteToProduction && !canDelete && (
            <p className="text-sm text-gray-500 text-center py-4">
              No actions available for this document
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Version History */}
      <CollapsibleSection title="Version History" defaultOpen={true} sectionKey="version-history">
        <div className="space-y-2">
          {allVersions.map((version) => (
            <div
              key={version.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                version.status === 'Released' ? "bg-green-50 border-green-200" :
                version.status === 'Obsolete' ? "bg-gray-50 border-gray-200" :
                version.status === 'Draft' ? "bg-gray-50 border-gray-300" :
                "bg-yellow-50 border-yellow-200"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {version.version}
                    </span>
                    <Badge className={cn("text-xs", STATUS_COLORS[version.status])}>
                      {version.status}
                    </Badge>
                    {version.is_production && (
                      <Badge variant="outline" className="text-xs">Production</Badge>
                    )}
                  </div>
                  {version.released_at && (
                    <p className="text-xs text-gray-600" suppressHydrationWarning>
                      Released {formatDate(version.released_at)}
                    </p>
                  )}
                </div>

                {/* Link to obsolete versions */}
                {version.status === 'Obsolete' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className="text-xs"
                  >
                    <Link href={`/document-version/${documentNumber}/${version.version}`}>
                      View
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Approver Management (for Draft documents only) */}
      {primaryDocument.status === 'Draft' && (isCreator || isAdmin) && (
        <CollapsibleSection title="Assign Approvers" defaultOpen={true} sectionKey="approvers">
          <ApproverManagement
            documentId={primaryDocument.id}
            approvers={approvers}
            availableUsers={availableUsers}
            disabled={false}
          />
        </CollapsibleSection>
      )}

      {/* Approval Workflow (if has approvers) */}
      {hasApprovers && primaryDocument.status === 'In Approval' && (
        <CollapsibleSection title="Approval Workflow" defaultOpen={true} sectionKey="approval">
          <ApprovalWorkflow
            documentId={primaryDocument.id}
            documentNumber={primaryDocument.document_number}
            documentStatus={primaryDocument.status}
            approvers={approvers}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
          />
        </CollapsibleSection>
      )}

      {/* Audit Trail */}
      <CollapsibleSection title="Audit Trail" defaultOpen={false} sectionKey="audit">
        <AuditTrail auditLogs={auditLogs} />
      </CollapsibleSection>

      {/* Admin Actions */}
      {isAdmin && (
        <CollapsibleSection title="Admin Actions" defaultOpen={false} sectionKey="admin">
          <AdminActions
            documentId={primaryDocument.id}
            documentNumber={primaryDocument.document_number}
            currentStatus={primaryDocument.status}
            currentVersion={primaryDocument.version}
            isProduction={primaryDocument.is_production}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}
