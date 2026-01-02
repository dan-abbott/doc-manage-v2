'use server'

import { createClient } from '@/lib/supabase/server'

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
 * This is the most commonly used function - lightweight and fast
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
