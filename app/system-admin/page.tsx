/**
 * System Admin Dashboard - WITH WORKING LINKS
 * app/system-admin/page.tsx
 */

import { getAllTenantMetrics, getSystemMetrics } from '@/app/actions/system-admin'
import Link from 'next/link'

export const revalidate = 0

export default async function SystemAdminPage() {
  const [tenantMetrics, systemMetrics] = await Promise.all([
    getAllTenantMetrics(),
    getSystemMetrics()
  ])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Smart file size formatting
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    
    const mb = bytes / (1024 * 1024)
    const gb = mb / 1024
    
    if (gb < 1) {
      return `${mb.toFixed(2)} MB`
    }
    
    return `${gb.toFixed(2)} GB`
  }

  // Format system-wide storage
  const formatSystemStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    
    if (gb < 0.01) {
      const mb = bytes / (1024 * 1024)
      return `${mb.toFixed(2)} MB`
    }
    
    return `${gb.toFixed(2)} GB`
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* System-Wide Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Tenants"
            value={systemMetrics.total_tenants}
            subtitle="Active Organizations"
            color="blue"
          />
          <MetricCard
            title="Total Users"
            value={systemMetrics.total_users}
            subtitle="Across All Tenants"
            color="green"
          />
          <MetricCard
            title="Total Documents"
            value={systemMetrics.total_documents}
            subtitle="System-Wide"
            color="purple"
          />
          <MetricCard
            title="Total Storage"
            value={formatSystemStorage(systemMetrics.total_storage_gb * 1024 * 1024 * 1024)}
            subtitle={`${formatCurrency(systemMetrics.total_storage_gb * 0.023)}/mo`}
            color="orange"
          />
        </div>

        {/* API Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <MetricCard
            title="VirusTotal Scans"
            value={systemMetrics.total_virustotal_calls}
            subtitle={formatCurrency(systemMetrics.total_virustotal_calls * 0.005)}
            color="red"
          />
          <MetricCard
            title="Email Sends"
            value={systemMetrics.total_email_sends}
            subtitle={formatCurrency(systemMetrics.total_email_sends * 0.001)}
            color="indigo"
          />
          <MetricCard
            title="Estimated Monthly Cost"
            value={formatCurrency(systemMetrics.total_estimated_cost)}
            subtitle="Total Infrastructure"
            color="gray"
            large
          />
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Tenant Details</h2>
          <p className="text-sm text-gray-600 mt-1">
            Click any tenant to view detailed information
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  VT Scans
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Emails
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Est. Cost/mo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenantMetrics.map((tenant) => (
                <tr
                  key={tenant.tenant_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/system-admin/tenants/${tenant.tenant_id}`}
                      className="block"
                    >
                      <div className="font-medium text-gray-900 hover:text-blue-600">
                        {tenant.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tenant.subdomain}.yourdomain.com
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.document_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900 font-medium">
                      {formatSize(tenant.storage_bytes)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(tenant.storage_gb * 0.023)}/mo
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900">{tenant.virustotal_calls}</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(tenant.virustotal_calls * 0.005)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900">{tenant.email_sends}</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(tenant.email_sends * 0.001)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(tenant.total_cost_estimate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(tenant.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tenantMetrics.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No tenants found
          </div>
        )}
      </div>

      {/* Pricing Notes */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Cost Estimates</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Storage: $0.023 per GB/month (Supabase pricing)</li>
          <li>• VirusTotal: $0.005 per scan (adjust to your actual rate)</li>
          <li>• Email (Resend): $0.001 per email (adjust to your actual rate)</li>
          <li>• These are estimates - verify with actual vendor invoices</li>
        </ul>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'gray'
  large?: boolean
}

function MetricCard({ title, value, subtitle, color, large }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    gray: 'bg-gray-100 border-gray-300'
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className={`font-bold text-gray-900 ${large ? 'text-3xl' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  )
}
