/**
 * Tenant Detail Page
 * app/system-admin/tenants/[id]/page.tsx
 */

import { getTenantDetails } from '@/app/actions/system-admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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

  const { tenant, users, recentDocs, apiUsage } = tenantData

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format storage
  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    const gb = mb / 1024
    return gb < 1 ? `${mb.toFixed(2)} MB` : `${gb.toFixed(2)} GB`
  }

  // Calculate API usage by day (last 30 days)
  const apiByDay = apiUsage.reduce((acc: any, usage: any) => {
    const date = new Date(usage.created_at).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = { virustotal: 0, email: 0 }
    }
    if (usage.api_type === 'virustotal') {
      acc[date].virustotal++
    } else if (usage.api_type === 'resend_email') {
      acc[date].email++
    }
    return acc
  }, {})

  const totalVtCalls = Object.values(apiByDay).reduce((sum: number, day: any) => sum + day.virustotal, 0)
  const totalEmails = Object.values(apiByDay).reduce((sum: number, day: any) => sum + day.email, 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/system-admin"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
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
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.company_name}
              className="w-16 h-16 object-contain"
            />
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Users" value={users.length} color="blue" />
        <MetricCard title="Documents" value={recentDocs.length} color="green" />
        <MetricCard title="VT Scans (30d)" value={totalVtCalls} color="red" />
        <MetricCard title="Emails (30d)" value={totalEmails} color="indigo" />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Sign In
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'Admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.last_sign_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Recent Documents</h2>
          <p className="text-sm text-gray-600 mt-1">Last 10 documents</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Document #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentDocs.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm text-gray-900">
                      {doc.document_number}{doc.version}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{doc.title}</div>
                  </td>
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
          <div className="px-6 py-12 text-center text-gray-500">
            No documents found
          </div>
        )}
      </div>

      {/* API Usage Chart (simplified) */}
      {Object.keys(apiByDay).length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">API Usage (Last 30 Days)</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(apiByDay)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 10)
                .map(([date, counts]: [string, any]) => (
                  <div key={date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">{date}</div>
                    <div className="flex-1 flex gap-2">
                      {counts.virustotal > 0 && (
                        <div className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded">
                          VT: {counts.virustotal}
                        </div>
                      )}
                      {counts.email > 0 && (
                        <div className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
                          Email: {counts.email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  color: 'blue' | 'green' | 'red' | 'indigo'
}

function MetricCard({ title, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    indigo: 'bg-indigo-50 border-indigo-200'
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Draft: 'bg-gray-100 text-gray-800',
    'In Approval': 'bg-yellow-100 text-yellow-800',
    Released: 'bg-green-100 text-green-800',
    Obsolete: 'bg-gray-200 text-gray-600'
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}
