import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNavTabs from './AdminNavTabs'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/')
  }

  // Check admin status
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, is_master_admin, tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/dashboard')
  }

  // Get tenant's virus scan setting
  const { data: tenant } = await supabase
    .from('tenants')
    .select('virus_scan_enabled')
    .eq('id', userData.tenant_id)
    .single()

  const virusScanEnabled = tenant?.virus_scan_enabled ?? true

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">Manage users, settings, and configuration</p>
        </div>

        {/* Admin Navigation Tabs */}
        <AdminNavTabs 
          isMasterAdmin={userData.is_master_admin || false}
          virusScanEnabled={virusScanEnabled}
        />

        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </div>
  )
}
