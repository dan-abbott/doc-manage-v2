'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import ReleaseDocumentButton from './[id]/ReleaseDocumentButton'
import SubmitForApprovalButton from './[id]/SubmitForApprovalButton'
import DeleteDocumentButton from './[id]/DeleteDocumentButton'
import CreateNewVersionButton from './[id]/CreateNewVersionButton'
import PromoteToProductionButton from './[id]/PromoteToProductionButton'
import ApprovalWorkflow from './[id]/ApprovalWorkflow'
import AuditTrail from './[id]/AuditTrail'
import SeeLatestReleasedButton from './[id]/SeeLatestReleasedButton'
import AdminActions from './[id]/AdminActions'
import AdminFileActions from './[id]/AdminFileActions'
import ChangeOwnerButton from './[id]/ChangeOwnerButton'
import AdminViewAllToggle from './AdminViewAllToggle'

interface DocumentActionsPanelProps {
  document: any
  approvers: any[]
  isCreator: boolean
  isAdmin: boolean
  currentUserId: string
  currentUserEmail: string
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
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
      {isOpen && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

export default function DocumentActionsPanel({
  document,
  approvers,
  isCreator,
  isAdmin,
  currentUserId,
  currentUserEmail
}: DocumentActionsPanelProps) {
  const hasApprovers = approvers && approvers.length > 0
  
  // Determine button visibility and actions
  const canEdit = (isCreator || isAdmin) && document.status === 'Draft'
  const canDelete = (isCreator || isAdmin) && document.status === 'Draft'
  
  const canRelease = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' && 
    !document.is_production &&
    !hasApprovers
  
  const canSubmitForApproval = 
    (isCreator || isAdmin) && 
    document.status === 'Draft' &&
    (hasApprovers || document.is_production)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Actions</h2>
        <p className="text-sm text-gray-500">Available actions for this document</p>
      </div>

      {/* Primary Actions Section */}
      <CollapsibleSection title="Primary Actions" defaultOpen={true}>
        <div className="space-y-2">
          {canEdit && (
            <Button asChild className="w-full">
              <Link href={`/documents/${document.id}/edit`}>
                Edit Document
              </Link>
            </Button>
          )}

          {canRelease && (
            <ReleaseDocumentButton 
              documentId={document.id}
              isProduction={document.is_production}
            />
          )}

          {canSubmitForApproval && (
            <SubmitForApprovalButton
              documentId={document.id}
              documentNumber={`${document.document_number}${document.version}`}
              approverCount={approvers.length}
            />
          )}

          {document.status === 'Released' && (isCreator || isAdmin) && (
            <CreateNewVersionButton
              documentId={document.id}
              documentNumber={document.document_number}
              version={document.version}
              isProduction={document.is_production}
            />
          )}

          {document.status === 'Released' && 
           !document.is_production && 
           (isCreator || isAdmin) && (
            <PromoteToProductionButton
              documentId={document.id}
              documentNumber={document.document_number}
              version={document.version}
            />
          )}

          {canDelete && (
            <DeleteDocumentButton documentId={document.id} />
          )}

          {!canEdit && !canRelease && !canSubmitForApproval && 
           document.status !== 'Released' && !canDelete && (
            <p className="text-sm text-gray-500 text-center py-4">
              No actions available for this document
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* See Latest Released (for obsolete documents) */}
      {document.status === 'Obsolete' && (
        <CollapsibleSection title="Latest Version" defaultOpen={true}>
          <SeeLatestReleasedButton 
            documentNumber={document.document_number}
            currentVersion={document.version}
          />
        </CollapsibleSection>
      )}

      {/* Approval Workflow Section */}
      {hasApprovers && (
        <CollapsibleSection title="Approval Workflow" defaultOpen={document.status === 'In Approval'}>
          <ApprovalWorkflow
            approvers={approvers}
            documentId={document.id}
            documentNumber={`${document.document_number}${document.version}`}
            documentStatus={document.status}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
          />
        </CollapsibleSection>
      )}

      {/* Audit Trail Section */}
      <CollapsibleSection title="Audit Trail" defaultOpen={false}>
        <AuditTrail documentId={document.id} />
      </CollapsibleSection>

      {/* Admin Section */}
      {isAdmin && (
        <>
          <CollapsibleSection title="Admin Actions" defaultOpen={false}>
            <div className="space-y-4">
              <ChangeOwnerButton 
                documentId={document.id}
                currentOwnerEmail={document.creator?.email || 'Unknown'}
              />
              
              <div className="pt-2 border-t">
                <AdminActions
                  documentId={document.id}
                  documentNumber={`${document.document_number}${document.version}`}
                  currentStatus={document.status}
                  currentVersion={document.version}
                  isProduction={document.is_production}
                />
              </div>
              
              <div className="pt-2 border-t">
                <AdminFileActions
                  documentId={document.id}
                  documentNumber={`${document.document_number}${document.version}`}
                  files={document.document_files || []}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Admin Settings" defaultOpen={false}>
            <AdminViewAllToggle />
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}
