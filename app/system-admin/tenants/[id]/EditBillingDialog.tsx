'use client'

import { useState } from 'react'
import { updateTenantBilling } from '@/app/actions/system-admin'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Calendar, CreditCard } from 'lucide-react'

interface EditBillingDialogProps {
  tenantId: string
  currentPlan: string
  currentNextBillingDate: string | null
  tenantName: string
  onUpdate?: () => void
}

export function EditBillingDialog({ 
  tenantId, 
  currentPlan, 
  currentNextBillingDate,
  tenantName,
  onUpdate 
}: EditBillingDialogProps) {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState(currentPlan)
  const [nextBillingDate, setNextBillingDate] = useState(
    currentNextBillingDate 
      ? new Date(currentNextBillingDate).toISOString().split('T')[0] 
      : ''
  )
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateTenantBilling({
        tenantId,
        plan,
        nextBillingDate: nextBillingDate || null,
        reason
      })

      if (result.success) {
        toast.success('Billing Updated', {
          description: result.message
        })
        setOpen(false)
        setReason('') // Reset reason
        onUpdate?.()
      } else {
        toast.error('Failed to Update Billing', {
          description: result.error
        })
      }
    } catch (error) {
      toast.error('Failed to Update Billing', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate months ahead for quick actions
  const addMonths = (months: number) => {
    const date = new Date()
    date.setMonth(date.getMonth() + months)
    setNextBillingDate(date.toISOString().split('T')[0])
    setReason(`Extended billing by ${months} month${months > 1 ? 's' : ''} as credit/reward`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Billing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Billing Details</DialogTitle>
            <DialogDescription>
              Update plan or extend billing date for {tenantName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Plan Selection */}
            <div>
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Free)</SelectItem>
                  <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                  <SelectItem value="professional">Professional ($99/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($299/mo)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Changes take effect immediately
              </p>
            </div>

            {/* Next Billing Date */}
            <div>
              <Label htmlFor="nextBillingDate">Next Billing Date</Label>
              <Input
                id="nextBillingDate"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to clear billing date
              </p>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMonths(1)}
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  +1 Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMonths(3)}
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  +3 Months
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMonths(6)}
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  +6 Months
                </Button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">Reason for Change</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Credit for service issue, Promotional offer, Plan upgrade"
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for audit trail
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Billing Impact</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Plan changes are immediate</li>
                    <li>• Extended billing dates prevent auto-charges</li>
                    <li>• Changes are logged in billing_history table</li>
                    <li>• Tenant receives email notification (future)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !reason}>
              {isSubmitting ? 'Updating...' : 'Update Billing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
