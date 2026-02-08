import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import CompanySettingsForm from './CompanySettingsForm'

export default async function CompanySettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Get user's tenant and master admin status
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, is_admin, is_master_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin && !userData?.is_master_admin) {
    redirect('/dashboard')
  }

  // FIXED: Get current subdomain from cookie (set by middleware)
  const cookieStore = await cookies()
  const currentSubdomain = cookieStore.get('tenant_subdomain')?.value || 'app'

  // FIXED: Query tenant by subdomain, not by user's tenant_id
  // This allows master admins to view settings for any tenant they're accessing
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', currentSubdomain)
    .single()

  if (!tenant) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tenant Not Found</h2>
          <p className="text-gray-600">
            Could not find settings for subdomain: {currentSubdomain}
          </p>
        </div>
      </div>
    )
  }

  // For non-master admins, verify they're viewing their own tenant
  if (!userData.is_master_admin && tenant.id !== userData.tenant_id) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>
        <p className="mt-2 text-gray-600">
          Customize your organization's branding and preferences
        </p>
        {userData.is_master_admin && (
          <p className="mt-1 text-sm text-blue-600">
            Viewing settings for: <strong>{currentSubdomain}</strong>
          </p>
        )}
      </div>

      <CompanySettingsForm tenant={tenant} />
    </div>
  )
}
