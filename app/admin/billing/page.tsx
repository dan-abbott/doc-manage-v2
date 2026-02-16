import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import BillingPageClient from './BillingPageClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/')
  }

  // Get subdomain tenant ID
  const subdomainCookie = cookieStore.get('tenant_subdomain')
  const subdomain = subdomainCookie?.value

  if (!subdomain) {
    redirect('/dashboard')
  }

  // Get tenant ID from subdomain
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('id, company_name, subdomain, created_at')
    .eq('subdomain', subdomain)
    .single()

  if (!tenantData) {
    redirect('/dashboard')
  }

  // Check admin status
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/dashboard')
  }

  // Get billing information
  const { data: billing } = await supabase
    .from('tenant_billing')
    .select('*')
    .eq('tenant_id', tenantData.id)
    .single()

  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantData.id)
    .order('invoice_date', { ascending: false })
    .limit(12)

  // Get usage stats (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: apiUsage } = await supabase
    .from('api_usage')
    .select('api_type, created_at')
    .eq('tenant_id', tenantData.id)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Calculate usage
  const vtScans = apiUsage?.filter(u => u.api_type === 'virustotal').length || 0
  const emailsSent = apiUsage?.filter(u => u.api_type === 'resend_email').length || 0

  // Get storage usage
  const { data: storageData } = await supabase
    .from('document_files')
    .select('file_size')
    .eq('tenant_id', tenantData.id)

  const totalStorage = storageData?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
  const storageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(2)

  // Get user count
  const { count: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantData.id)

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BillingPageClient
          tenant={tenantData}
          billing={billing}
          invoices={invoices || []}
          usage={{
            vtScans,
            emailsSent,
            storageGB,
            userCount: userCount || 0
          }}
        />
      </div>
    </div>
  )
}
