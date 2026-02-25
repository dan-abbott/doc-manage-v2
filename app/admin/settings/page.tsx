import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanySettingsForm from './CompanySettingsForm'
import { getCurrentSubdomain } from '@/lib/tenant'

export default async function CompanySettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, is_admin, is_master_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin && !userData?.is_master_admin) {
    redirect('/dashboard')
  }

  const currentSubdomain = await getCurrentSubdomain()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name, subdomain, logo_url, auto_rename_files, timezone')
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

  if (!userData.is_master_admin && tenant.id !== userData.tenant_id) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>
        <p className="mt-2 text-gray-600">
          Manage your organization's identity and preferences
        </p>
        {userData.is_master_admin && (
          <p className="mt-1 text-sm text-[#2563EB]">
            Viewing settings for: <strong>{currentSubdomain}</strong>
          </p>
        )}
      </div>

      <CompanySettingsForm
        tenant={{
          id: tenant.id,
          company_name: tenant.company_name,
          subdomain: tenant.subdomain,
          logo_url: tenant.logo_url,
          auto_rename_files: tenant.auto_rename_files ?? true,
          timezone: tenant.timezone ?? 'America/Los_Angeles',
        }}
      />
    </div>
  )
}
