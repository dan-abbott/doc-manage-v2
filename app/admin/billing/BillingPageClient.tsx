'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  Mail, 
  Shield, 
  HardDrive,
  ArrowUpCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { UpgradePlanDialog } from './UpgradePlanDialog'

interface BillingPageClientProps {
  tenant: any
  billing: any
  invoices: any[]
  usage: {
    vtScans: number
    emailsSent: number
    storageGB: string
    userCount: number
  }
}

export default function BillingPageClient({ 
  tenant, 
  billing, 
  invoices,
  usage 
}: BillingPageClientProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // Plan pricing
  const planPrices: Record<string, number> = {
    trial: 0,
    starter: 29,
    professional: 99,
    enterprise: 299
  }

  const currentPlan = billing?.plan || 'trial'
  const currentPrice = planPrices[currentPlan]

  // Calculate usage costs
  const vtCost = usage.vtScans * 0.005
  const emailCost = usage.emailsSent * 0.001
  const estimatedMonthlyCost = currentPrice + vtCost + emailCost

  // Format helpers
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      trial: { bg: 'bg-blue-100', text: 'text-blue-800' },
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      past_due: { bg: 'bg-red-100', text: 'text-red-800' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' }
    }
    const style = styles[status] || styles.trial
    return (
      <Badge className={`${style.bg} ${style.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  // Plan features
  const planFeatures: Record<string, string[]> = {
    trial: [
      '14-day trial',
      'Up to 5 users',
      'Basic document control',
      'Email support'
    ],
    starter: [
      'Up to 25 users',
      'Unlimited documents',
      'Version control',
      'Email notifications',
      'Basic reporting',
      'Email support'
    ],
    professional: [
      'Up to 100 users',
      'Everything in Starter',
      'Advanced workflows',
      'Custom branding',
      'Priority support',
      'API access'
    ],
    enterprise: [
      'Unlimited users',
      'Everything in Professional',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'Advanced security'
    ]
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your subscription, view usage, and upgrade your plan
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription</CardDescription>
          </div>
          <Button onClick={() => setShowUpgradeDialog(true)} size="sm">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan Details */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Subscription</div>
              <div className="text-3xl font-bold text-gray-900 capitalize mb-2">
                {currentPlan}
              </div>
              <div className="text-2xl font-semibold text-gray-700 mb-3">
                {formatCurrency(currentPrice)}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </div>
              {getStatusBadge(billing?.status || 'trial')}
            </div>

            {/* Billing Info */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Billing Cycle</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {billing?.billing_cycle || 'Monthly'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    Next billing: {formatDate(billing?.current_period_end)}
                  </span>
                </div>
                {billing?.trial_ends_at && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Calendar className="h-4 w-4" />
                    <span>Trial ends: {formatDate(billing.trial_ends_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Features */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Included Features</div>
              <ul className="space-y-1">
                {planFeatures[currentPlan]?.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Last 30 days of activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Users</div>
                    <div className="text-xs text-gray-500">Active accounts</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{usage.userCount}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Virus Scans</div>
                    <div className="text-xs text-gray-500">${(usage.vtScans * 0.005).toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{usage.vtScans}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Mail className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Emails Sent</div>
                    <div className="text-xs text-gray-500">${(usage.emailsSent * 0.001).toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{usage.emailsSent}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <HardDrive className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Storage</div>
                    <div className="text-xs text-gray-500">Total used</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{usage.storageGB} GB</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Estimated monthly charges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base subscription</span>
                <span className="font-medium text-gray-900">{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Virus scanning ({usage.vtScans} scans)</span>
                <span className="font-medium text-gray-900">{formatCurrency(vtCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Email sending ({usage.emailsSent} emails)</span>
                <span className="font-medium text-gray-900">{formatCurrency(emailCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Storage ({usage.storageGB} GB)</span>
                <span className="font-medium text-gray-900">{formatCurrency(0)}</span>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Estimated Total</div>
                    <div className="text-xs text-gray-500">For this billing period</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(estimatedMonthlyCost)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method */}
      {billing?.payment_method_last4 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Your default payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {billing.payment_method_brand} •••• {billing.payment_method_last4}
                  </div>
                  {billing.payment_method_exp_month && billing.payment_method_exp_year && (
                    <div className="text-sm text-gray-500">
                      Expires {billing.payment_method_exp_month}/{billing.payment_method_exp_year}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            Account created {formatDate(tenant.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="text-sm">
                      <td className="py-3 text-gray-900">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="py-3 font-medium text-gray-900">
                        {formatCurrency(invoice.amount_paid || invoice.amount_due)}
                      </td>
                      <td className="py-3">
                        <Badge 
                          className={
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No invoices yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <UpgradePlanDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlan={currentPlan}
        tenantId={tenant.id}
      />
    </>
  )
}
