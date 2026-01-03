import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanySettingsForm from './CompanySettingsForm'

export default async function CompanySettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Get user's tenant
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/dashboard')
  }

  // Get tenant settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userData.tenant_id)
    .single()

  if (!tenant) {
    return <div>Error loading tenant settings</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>
        <p className="mt-2 text-gray-600">
          Customize your organization's branding and preferences
        </p>
      </div>

      <CompanySettingsForm tenant={tenant} />
    </div>
  )
}
