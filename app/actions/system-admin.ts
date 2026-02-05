/**
 * System Admin Server Actions
 * app/actions/system-admin.ts
 * 
 * IMPORTANT: These actions bypass tenant_id filtering!
 * Only accessible to is_master_admin users
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
  virustotal_calls: number
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
  total_virustotal_calls: number
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
    redirect('/dashboard') // Not authorized
  }

  return { supabase, user }
}

/**
 * Get all tenant metrics
 */
export async function getAllTenantMetrics(): Promise<TenantMetrics[]> {
  const { supabase } = await checkMasterAdmin()

  // Get all tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, company_name, subdomain, created_at')
    .order('company_name')

  if (!tenants) return []

  // Get metrics for each tenant
  const metrics = await Promise.all(
    tenants.map(async (tenant) => {
      // User count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      // Document count  
      const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      // Storage usage (sum of file sizes)
      const { data: storageData } = await supabase
        .from('document_files')
        .select('file_size')
        .eq('tenant_id', tenant.id)

      const storageBytes = storageData?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
      const storageMB = storageBytes / (1024 * 1024)
      const storageGB = storageMB / 1024

      // API usage (if tracking enabled)
      const { count: virusTotalCalls } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('api_type', 'virustotal')

      const { count: emailSends } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('api_type', 'resend_email')

      // Last activity (most recent document update)
      const { data: lastDoc } = await supabase
        .from('documents')
        .select('updated_at')
        .eq('tenant_id', tenant.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      // Cost estimates (adjust these based on actual pricing)
      const virusTotalCost = (virusTotalCalls || 0) * 0.005 // $0.005 per scan
      const emailCost = (emailSends || 0) * 0.001 // $0.001 per email
      const storageCost = storageGB * 0.023 // $0.023 per GB/month (Supabase pricing)
      const totalCost = virusTotalCost + emailCost + storageCost

      return {
        tenant_id: tenant.id,
        company_name: tenant.company_name,
        subdomain: tenant.subdomain,
        user_count: userCount || 0,
        document_count: documentCount || 0,
        storage_bytes: storageBytes,
        storage_mb: storageMB,
        storage_gb: storageGB,
        virustotal_calls: virusTotalCalls || 0,
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

  // Total tenants
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Total documents
  const { count: totalDocuments } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Total storage
  const { data: allFiles } = await supabase
    .from('document_files')
    .select('file_size')

  const totalStorageBytes = allFiles?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
  const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024)

  // Total API usage
  const { count: totalVirusTotalCalls } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('api_type', 'virustotal')

  const { count: totalEmailSends } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('api_type', 'resend_email')

  // Total estimated costs
  const virusTotalCost = (totalVirusTotalCalls || 0) * 0.005
  const emailCost = (totalEmailSends || 0) * 0.001
  const storageCost = totalStorageGB * 0.023
  const totalEstimatedCost = virusTotalCost + emailCost + storageCost

  return {
    total_tenants: totalTenants || 0,
    total_users: totalUsers || 0,
    total_documents: totalDocuments || 0,
    total_storage_gb: totalStorageGB,
    total_virustotal_calls: totalVirusTotalCalls || 0,
    total_email_sends: totalEmailSends || 0,
    total_estimated_cost: totalEstimatedCost
  }
}

/**
 * Get detailed tenant information
 */
export async function getTenantDetails(tenantId: string) {
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

  // Get API usage over time (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: apiUsage } = await supabase
    .from('api_usage')
    .select('api_type, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at')

  return {
    tenant,
    users: users || [],
    recentDocs: recentDocs || [],
    apiUsage: apiUsage || []
  }
}
