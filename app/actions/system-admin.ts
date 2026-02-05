/**
 * FIXED System Admin Server Actions
 * app/actions/system-admin.ts
 * 
 * Changes:
 * 1. Fixed storage query - joins through documents table to get tenant_id
 * 2. Added better error handling
 * 3. Added console logs for debugging
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
    redirect('/dashboard')
  }

  return { supabase, user }
}

/**
 * Get storage for a tenant
 * Handles both cases: tenant_id directly on document_files OR needs join through documents
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

  // Get all tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, company_name, subdomain, created_at')
    .order('company_name')

  if (!tenants) {
    console.log('[System Admin] No tenants found')
    return []
  }

  console.log(`[System Admin] Found ${tenants.length} tenants`)

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

      // Storage usage
      const storageBytes = await getTenantStorage(supabase, tenant.id)
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

      // Last activity
      const { data: lastDoc } = await supabase
        .from('documents')
        .select('updated_at')
        .eq('tenant_id', tenant.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      // Cost estimates
      const virusTotalCost = (virusTotalCalls || 0) * 0.005
      const emailCost = (emailSends || 0) * 0.001
      const storageCost = storageGB * 0.023
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

  console.log('[System Admin] Fetching system metrics...')

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

  // Total storage - try both methods
  let totalStorageBytes = 0
  
  // Method 1: Direct query
  const { data: allFilesDirectData } = await supabase
    .from('document_files')
    .select('file_size')

  if (allFilesDirectData && allFilesDirectData.length > 0) {
    totalStorageBytes = allFilesDirectData.reduce((sum: number, file: any) => 
      sum + (file.file_size || 0), 0
    )
  }

  // Method 2: If no data, try join (shouldn't be needed for system-wide)
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
