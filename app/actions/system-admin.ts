/**
 * System Admin Server Actions - WITH BILLING
 * app/actions/system-admin.ts
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface TenantMetrics {
  tenant_id: string
  company_name: string
  subdomain: string
  user_count: number
  document_count: number
  storage_bytes: number
  storage_mb: number
  storage_gb: number
  email_sends: number
  total_cost_estimate: number
  created_at: string
  last_activity: string | null
}

interface SystemMetrics {
  total_tenants: number
  total_users: number
  total_documents: number
  total_storage_gb: number
  total_email_sends: number
  total_estimated_cost: number
}

/**
 * Check if current user is master admin
 */
async function checkMasterAdmin() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_master_admin) {
    redirect('/dashboard')
  }

  return { supabase, user }
}

/**
 * Get storage for a tenant
 */
async function getTenantStorage(supabase: any, tenantId: string): Promise<number> {
  // Try direct query first (if tenant_id exists on document_files)
  const { data: directData, error: directError } = await supabase
    .from('document_files')
    .select('file_size')
    .eq('tenant_id', tenantId)

  if (!directError && directData) {
    const bytes = directData.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0)
    console.log(`[Storage] Tenant ${tenantId}: ${bytes} bytes (direct query)`)
    return bytes
  }

  // If that fails, join through documents table
  const { data: joinData, error: joinError } = await supabase
    .from('document_files')
    .select(`
      file_size,
      document_id,
      documents!inner(tenant_id)
    `)
    .eq('documents.tenant_id', tenantId)

  if (joinError) {
    console.error(`[Storage Error] Tenant ${tenantId}:`, joinError)
    return 0
  }

  const bytes = joinData?.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0) || 0
  console.log(`[Storage] Tenant ${tenantId}: ${bytes} bytes (join query)`)
  return bytes
}

/**
 * Get all tenant metrics
 */
export async function getAllTenantMetrics(): Promise<TenantMetrics[]> {
  const { supabase } = await checkMasterAdmin()

  console.log('[System Admin] Fetching tenant metrics...')

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, company_name, subdomain, created_at')
    .order('company_name')

  if (!tenants) {
    console.log('[System Admin] No tenants found')
    return []
  }

  console.log(`[System Admin] Found ${tenants.length} tenants`)

  const metrics = await Promise.all(
    tenants.map(async (tenant) => {
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      const storageBytes = await getTenantStorage(supabase, tenant.id)
      const storageMB = storageBytes / (1024 * 1024)
      const storageGB = storageMB / 1024

      // Count email sends
      const { count: emailSends } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('action', 'email_sent')

      const { data: lastDoc } = await supabase
        .from('documents')
        .select('updated_at')
        .eq('tenant_id', tenant.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      const emailCost = (emailSends || 0) * 0.001
      const storageCost = storageGB * 0.023
      const totalCost = emailCost + storageCost

      return {
        tenant_id: tenant.id,
        company_name: tenant.company_name,
        subdomain: tenant.subdomain,
        user_count: userCount || 0,
        document_count: documentCount || 0,
        storage_bytes: storageBytes,
        storage_mb: storageMB,
        storage_gb: storageGB,
        email_sends: emailSends || 0,
        total_cost_estimate: totalCost,
        created_at: tenant.created_at,
        last_activity: lastDoc?.updated_at || null
      }
    })
  )

  return metrics
}

/**
 * Get system-wide metrics
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const { supabase } = await checkMasterAdmin()

  console.log('[System Admin] Fetching system metrics...')

  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: totalDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  let totalStorageBytes = 0
  
  const { data: allFilesDirectData } = await supabase
    .from('document_files')
    .select('file_size')

  if (allFilesDirectData && allFilesDirectData.length > 0) {
    totalStorageBytes = allFilesDirectData.reduce((sum: number, file: any) => 
      sum + (file.file_size || 0), 0
    )
  }

  if (totalStorageBytes === 0) {
    const { data: allFilesJoinData } = await supabase
      .from('document_files')
      .select('file_size, document_id, documents!inner(id)')

    if (allFilesJoinData) {
      totalStorageBytes = allFilesJoinData.reduce((sum: number, file: any) => 
        sum + (file.file_size || 0), 0
      )
    }
  }

  const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024)
  console.log(`[System Admin] Total storage: ${totalStorageBytes} bytes (${totalStorageGB.toFixed(2)} GB)`)

  // Count email sends from audit_log (email_sent actions)
  const { count: totalEmailSends } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'email_sent')

  const emailCost = (totalEmailSends || 0) * 0.001
  const storageCost = totalStorageGB * 0.023
  const totalEstimatedCost = emailCost + storageCost

  return {
    total_tenants: totalTenants || 0,
    total_users: totalUsers || 0,
    total_documents: totalDocuments || 0,
    total_storage_gb: totalStorageGB,
    total_email_sends: totalEmailSends || 0,
    total_estimated_cost: totalEstimatedCost
  }
}

/**
 * Get detailed tenant information
 * UPDATED: Now includes billing data
 */
export async function getTenantDetails(tenantId: string): Promise<{
  tenant: any
  users: any[]
  recentDocs: any[]
  apiUsage: any[]
  billing: any
  invoices: any[]
}> {
    const { supabase } = await checkMasterAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // Get users
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, role, email, created_at, last_sign_in_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Get recent documents
  const { data: recentDocs } = await supabase
    .from('documents')
    .select('id, document_number, version, title, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get API usage (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: apiUsage } = await supabase
    .from('api_usage')
    .select('api_type, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at')

  // Get billing information
  const { data: billing } = await supabase
    .from('tenant_billing')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  // ✅ NEW: Get invoice history
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false })
    .limit(20)

  return {
    tenant,
    users: users || [],
    recentDocs: recentDocs || [],
    apiUsage: apiUsage || [],
    billing: billing || null,
    invoices: invoices || []  // ✅ ADD THIS
  }
}

/**
 * Update tenant billing details (plan and next billing date)
 * Master admin only
 */
export async function updateTenantBilling(data: {
  tenantId: string
  plan: string
  nextBillingDate: string | null
  reason: string
}) {
  await checkMasterAdmin()
  
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate plan
    const validPlans = ['trial', 'starter', 'professional', 'enterprise']
    if (!validPlans.includes(data.plan)) {
      return { success: false, error: 'Invalid plan' }
    }

    // Get current billing info
    const { data: currentBilling } = await supabase
      .from('tenant_billing')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .single()

    // Prepare update data
    const updateData: any = {
      plan: data.plan,
      updated_at: new Date().toISOString()
    }

    // Update next billing date if provided
    if (data.nextBillingDate) {
      updateData.current_period_end = new Date(data.nextBillingDate).toISOString()
    }

    // Update billing record
    const { error: updateError } = await supabase
      .from('tenant_billing')
      .update(updateData)
      .eq('tenant_id', data.tenantId)

    if (updateError) {
      console.error('Failed to update billing:', updateError)
      return { success: false, error: 'Failed to update billing' }
    }

    // Log to billing history
    await supabase
      .from('billing_history')
      .insert({
        tenant_id: data.tenantId,
        action: 'manual_adjustment',
        previous_plan: currentBilling?.plan || null,
        new_plan: data.plan,
        previous_billing_date: currentBilling?.current_period_end || null,
        new_billing_date: data.nextBillingDate,
        reason: data.reason,
        performed_by: user.id,
        performed_by_email: user.email
      })

    console.log(`[Billing] Updated for tenant ${data.tenantId}: ${data.plan}, next bill: ${data.nextBillingDate}`)

    return { 
      success: true, 
      message: `Billing updated: ${data.plan} plan${data.nextBillingDate ? `, next bill: ${new Date(data.nextBillingDate).toLocaleDateString()}` : ''}`
    }
  } catch (error: any) {
    console.error('Failed to update tenant billing:', error)
    return { success: false, error: error.message || 'Failed to update billing' }
  }
}

