import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import BillingPageClient from './BillingPageClient'
import { syncInvoicesFromStripe } from './sync-invoices'

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

  // Get invoices - sync from Stripe first to backfill any missing
  let invoices = []
  if (billing?.stripe_customer_id) {
    invoices = await syncInvoicesFromStripe(tenantData.id, billing.stripe_customer_id)
  } else {
    // Fallback to database only if no Stripe customer
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantData.id)
      .order('invoice_date', { ascending: false })
      .limit(12)
    invoices = dbInvoices || []
  }

  // Get usage stats (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // ⭐ FIX 1: Use service role client to bypass RLS for api_usage
  const supabaseAdmin = createServiceRoleClient()
  
  const { data: apiUsage } = await supabaseAdmin
    .from('api_usage')
    .select('api_type, created_at')
    .eq('tenant_id', tenantData.id)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Calculate usage
  const vtScans = apiUsage?.filter(u => u.api_type === 'virustotal').length || 0
  const emailsSent = apiUsage?.filter(u => u.api_type === 'resend_email').length || 0

  // Get storage usage (use admin client to bypass RLS)
  const { data: storageData } = await supabaseAdmin
    .from('document_files')
    .select('file_size, documents!inner(tenant_id)')
    .eq('documents.tenant_id', tenantData.id)

  const totalStorage = storageData?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
  const storageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(2)

  // Get user count (use admin client to bypass RLS)
  const { count: userCount } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantData.id)
    .neq('role', 'Deactivated')

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
