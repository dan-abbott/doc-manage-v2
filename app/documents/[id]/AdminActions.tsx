'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface AdminActionsProps {
  documentId: string
  documentNumber: string
  currentStatus: string
  currentVersion: string
  isProduction: boolean
}

export default function AdminActions({
  documentId,
  documentNumber,
  currentStatus,
  currentVersion,
  isProduction,
}: AdminActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingAction, setPendingAction] = useState<any>(null)

  // Form state
  const [newStatus, setNewStatus] = useState(currentStatus)
  const [newVersion, setNewVersion] = useState(currentVersion)

  const handleForceStatusChange = async () => {
    if (newStatus === currentStatus) {
      toast.error('Status unchanged')
      return
    }

    setPendingAction({
      type: 'status',
      value: newStatus,
    })
    setShowConfirm(true)
  }

  const handleForceVersionChange = async () => {
    if (newVersion === currentVersion) {
      toast.error('Version unchanged')
      return
    }

    setPendingAction({
      type: 'version',
      value: newVersion,
    })
    setShowConfirm(true)
  }

  const executeAdminAction = async () => {
    setIsLoading(true)
    setShowConfirm(false)

    try {
      let response
      
      if (pendingAction.type === 'status') {
        response = await fetch('/api/admin/force-status-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            newStatus: pendingAction.value,
          }),
        })
      } else if (pendingAction.type === 'version') {
        response = await fetch('/api/admin/force-version-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            newVersion: pendingAction.value,
          }),
        })
      }

      const result = await response?.json()

      if (result?.success) {
        toast.success(`Admin action completed: ${pendingAction.type} changed`)
        router.refresh()
      } else {
        toast.error(result?.error || 'Admin action failed')
      }
    } catch (error: any) {
      console.error('Admin action error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-red-900">
            <ShieldCheck className="h-4 w-4" />
            Admin Actions
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="h-3 w-3" />
            <span>These actions bypass normal workflows and are logged</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Force Status Change */}
          <div className="space-y-2">
            <Label htmlFor="admin-status" className="text-sm font-medium">
              Force Status Change
            </Label>
            <div className="flex gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="admin-status" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="In Approval">In Approval</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="Obsolete">Obsolete</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleForceStatusChange}
                disabled={isLoading || newStatus === currentStatus}
                variant="destructive"
                size="sm"
              >
                Change Status
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Current: <span className="font-medium">{currentStatus}</span>
            </p>
          </div>

          {/* Force Version Change */}
          <div className="space-y-2">
            <Label htmlFor="admin-version" className="text-sm font-medium">
              Force Version Change
            </Label>
            <div className="flex gap-2">
              <Input
                id="admin-version"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder={isProduction ? "v1, v2, v3..." : "vA, vB, vC..."}
                className="flex-1"
              />
              <Button
                onClick={handleForceVersionChange}
                disabled={isLoading || newVersion === currentVersion}
                variant="destructive"
                size="sm"
              >
                Change Version
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Current: <span className="font-medium">{currentVersion}</span>
            </p>
            <p className="text-xs text-amber-600">
              ⚠️ Warning: Changing version may cause numbering conflicts
            </p>
          </div>

          {/* Info */}
          <div className="pt-2 border-t border-red-200">
            <p className="text-xs text-gray-600">
              <strong>Document:</strong> {documentNumber}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Type:</strong> {isProduction ? 'Production' : 'Prototype'}
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={executeAdminAction}
        title="Confirm Admin Action"
        description={`Are you sure you want to force change ${pendingAction?.type} to "${pendingAction?.value}"? This action will be logged in the audit trail.`}
        confirmText="Execute Admin Action"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}
