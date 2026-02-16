'use client'

import { useState } from 'react'
import { upgradeTenantPlan } from '@/app/actions/billing'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, Sparkles, Crown, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: string
  tenantId: string
}

export function UpgradePlanDialog({ 
  open, 
  onOpenChange, 
  currentPlan,
  tenantId 
}: UpgradePlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const router = useRouter()

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      icon: Sparkles,
      color: 'blue',
      features: [
        'Up to 25 users',
        'Unlimited documents',
        'Version control',
        'Email notifications',
        'Basic reporting',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 99,
      icon: Crown,
      color: 'purple',
      popular: true,
      features: [
        'Up to 100 users',
        'Everything in Starter',
        'Advanced workflows',
        'Custom branding',
        'Priority support',
        'API access',
        'Advanced reporting'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 299,
      icon: Building2,
      color: 'indigo',
      features: [
        'Unlimited users',
        'Everything in Professional',
        'Dedicated support',
        'SLA guarantee',
        'Custom integrations',
        'Advanced security',
        'White-label option'
      ]
    }
  ]

  // Filter out current plan and lower plans
  const planOrder = ['trial', 'starter', 'professional', 'enterprise']
  const currentIndex = planOrder.indexOf(currentPlan)
  const upgradablePlans = plans.filter(plan => {
    const planIndex = planOrder.indexOf(plan.id)
    return planIndex > currentIndex
  })

  const handleUpgrade = async () => {
    if (!selectedPlan) return

    setIsUpgrading(true)
    console.log('🔵 [UI] Starting upgrade process:', {
      tenantId,
      currentPlan,
      selectedPlan
    })

    try {
      console.log('🔵 [UI] Calling upgradeTenantPlan...')
      const result = await upgradeTenantPlan({
        tenantId,
        newPlan: selectedPlan
      })

      console.log('🟢 [UI] upgradeTenantPlan result:', result)

      if (result.success) {
        // Check if we got a checkout URL (new subscription - needs payment)
        if (result.checkoutUrl) {
          console.log('🔵 [UI] Redirecting to Stripe checkout:', result.checkoutUrl)
          // Redirect to Stripe checkout
          window.location.href = result.checkoutUrl
          return // Don't close dialog or show toast, just redirect
        }
        
        console.log('✅ [UI] Subscription updated directly (no checkout needed)')
        // Subscription updated directly (already has payment method)
        toast.success('Plan Upgraded!', {
          description: result.message
        })
        onOpenChange(false)
        router.refresh()
      } else {
        console.error('🔴 [UI] Upgrade failed:', result.error)
        toast.error('Upgrade Failed', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('🔴 [UI] Exception during upgrade:', error)
      toast.error('Upgrade Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsUpgrading(false)
    }
  }

  if (upgradablePlans.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Already on the Best Plan!</DialogTitle>
            <DialogDescription>
              You're currently on the {currentPlan} plan. There are no higher plans available to upgrade to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">
              You're already enjoying all the features we offer!
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose a plan that fits your needs. Upgrade takes effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {upgradablePlans.map((plan) => {
            const Icon = plan.icon
            const isSelected = selectedPlan === plan.id

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                  isSelected
                    ? 'border-blue-600 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${plan.color}-100 mb-3`}>
                    <Icon className={`h-6 w-6 text-${plan.color}-600`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button */}
                <Button
                  className="w-full"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Upgrade Info */}
        {selectedPlan && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong> Your plan will upgrade immediately. 
              You'll be charged the prorated amount for the remainder of your billing cycle, 
              and the new plan price will apply starting with your next billing date.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpgrading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || isUpgrading}
          >
            {isUpgrading ? 'Upgrading...' : 'Upgrade Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
