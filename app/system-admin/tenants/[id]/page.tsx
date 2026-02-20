/**
 * Tenant Detail Page with Invoice History
 * app/system-admin/tenants/[id]/page.tsx
 */

import { getTenantDetails } from '@/app/actions/system-admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EditBillingDialog } from './EditBillingDialog'

export const revalidate = 0

interface PageProps {
  params: {
    id: string
  }
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = params

  let tenantData
  try {
    tenantData = await getTenantDetails(id)
  } catch (error) {
    notFound()
  }

  const { tenant, users, recentDocs, apiUsage, billing, invoices } = tenantData

  // Format helpers
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Calculate API usage
  const apiByDay = apiUsage.reduce((acc: any, usage: any) => {
    const date = new Date(usage.created_at).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = { email: 0 }
    } else if (usage.api_type === 'resend_email') acc[date].email++
    return acc
  }, {})
  const totalEmail = Object.values(apiByDay).reduce((sum: number, day: any) => sum + day.email, 0)

  // Calculate usage costs
  const emailCost = totalEmail * 0.001
  const storageCost = 0 // TODO: Get from tenant metrics

  // Get plan price
  const planPrices: Record<string, number> = {
    trial: 0,
    starter: 29,
    professional: 99,
    enterprise: 299
  }
  const planPrice = planPrices[billing?.plan || 'trial'] || 0

  const totalMonthlyCost = emailCost + storageCost + planPrice

  // Status badge color
  const statusColors: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    past_due: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    suspended: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/system-admin" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to System Admin
        </Link>
      </div>

      {/* Tenant Header */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tenant.company_name}</h1>
            <p className="text-gray-600 mt-1">{tenant.subdomain}.yourdomain.com</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span>ID: {tenant.id}</span>
              <span>Created: {formatDate(tenant.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Users" value={users.length} color="blue" />
        <MetricCard title="Documents" value={recentDocs.length} color="green" />
        <MetricCard title="Emails (30d)" value={totalEmail} color="indigo" />
      </div>

      {/* Billing & Payment Section */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Billing & Payment</h2>
          <EditBillingDialog
            tenantId={tenant.id}
            currentPlan={billing?.plan || 'trial'}
            currentNextBillingDate={billing?.current_period_end || null}
            tenantName={tenant.company_name}
          />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Billing Status */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Billing Status</div>
              <div className="space-y-3">
                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    statusColors[billing?.status || 'trial']
                  }`}>
                    {(billing?.status || 'trial').charAt(0).toUpperCase() + (billing?.status || 'trial').slice(1)}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span className="text-gray-900 capitalize">{billing?.plan || 'Trial'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billing:</span>
                    <span className="text-gray-900 capitalize">{billing?.billing_cycle || 'N/A'}</span>
                  </div>
                  {billing?.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Bill:</span>
                      <span className="text-gray-900">{formatDate(billing.current_period_end)}</span>
                    </div>
                  )}
                  {billing?.trial_ends_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trial Ends:</span>
                      <span className="text-gray-900">{formatDate(billing.trial_ends_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Payment Method</div>
              <div className="space-y-3">
                {billing?.payment_method_last4 ? (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="text-gray-900 capitalize">
                        {billing.payment_method_brand} •••• {billing.payment_method_last4}
                      </span>
                    </div>
                    {billing.payment_method_exp_month && billing.payment_method_exp_year && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expires:</span>
                        <span className="text-gray-900">
                          {billing.payment_method_exp_month}/{billing.payment_method_exp_year}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No payment method on file</div>
                )}
              </div>
            </div>

            {/* Monthly Cost */}
            <div>
              <div className="text-sm text-gray-600 mb-2">Estimated Monthly Cost</div>
              <div className="text-3xl font-bold text-gray-900 mb-3">
                {formatCurrency(totalMonthlyCost)}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subscription:</span>
                  <span className="text-gray-900">{formatCurrency(planPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <span className="text-gray-900">{formatCurrency(storageCost)}</span>
                </div>
                <div className="flex justify-between">
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{formatCurrency(emailCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice History - NEW */}
      {invoices && invoices.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Invoice History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paid Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount_paid)}
                      </div>
                      {invoice.amount_due !== invoice.amount_paid && (
                        <div className="text-xs text-gray-500">
                          Due: {formatCurrency(invoice.amount_due)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invoice.paid_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View Invoice →
                        </a>
                      )}
                      {invoice.invoice_pdf_url && (
                        <a
                          href={invoice.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 text-blue-600 hover:text-blue-700"
                        >
                          Download PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role || 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">No users found</div>
        )}
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Recent Documents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentDocs.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {doc.document_number}{doc.version}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{doc.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(doc.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentDocs.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">No documents found</div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    indigo: 'bg-indigo-50 border-indigo-200'
  }

  return (
    <div className={`rounded-lg border p-6 ${colors[color]}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-800',
    'In Approval': 'bg-yellow-100 text-yellow-800',
    Released: 'bg-green-100 text-green-800',
    Obsolete: 'bg-gray-200 text-gray-600'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    open: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    void: 'bg-gray-200 text-gray-600',
    uncollectible: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
