'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * Get the current subdomain from request headers
 */
export async function getCurrentSubdomain(): Promise<string | null> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  
  // Extract subdomain from host
  // Format: subdomain.baselinedocs.com or localhost:3000
  if (host.includes('localhost')) {
    return 'app' // Default to 'app' for local development
  }
  
  const parts = host.split('.')
  if (parts.length >= 3) {
    return parts[0] // e.g., 'acme' from 'acme.baselinedocs.com'
  }
  
  return 'app' // Default subdomain
}

/**
 * Get tenant ID based on CURRENT SUBDOMAIN (not user's tenant)
 * This is what should be used for queries to enforce tenant isolation
 * based on which subdomain the user is currently accessing
 */
export async function getSubdomainTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const subdomain = await getCurrentSubdomain()
  
  if (!subdomain) return null
  
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  
  return data?.id || null
}

/**
 * Get the current user's full tenant information
 */
export async function getCurrentTenant() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: userData } = await supabase
    .from('users')
    .select(`
      tenant_id,
      tenants (
        id,
        company_name,
        subdomain,
        logo_url,
        primary_color,
        secondary_color,
        is_active
      )
    `)
    .eq('id', user.id)
    .single()
  
  return userData?.tenants || null
}

/**
 * Get just the tenant_id for the current user
 * This returns the user's HOME tenant, not necessarily the one they're viewing
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  
  return userData?.tenant_id || null
}

/**
 * Check if a user belongs to a specific tenant
 */
export async function userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()
  
  return !!data
}

/**
 * Check if current user is a master admin
 */
export async function isMasterAdmin(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', user.id)
    .single()
  
  return userData?.is_master_admin || false
}
