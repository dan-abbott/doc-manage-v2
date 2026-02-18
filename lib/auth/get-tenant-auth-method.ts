/**
 * Get tenant's configured authentication method
 * lib/auth/get-tenant-auth-method.ts
 */

import { createClient } from '@/lib/supabase/server'

export type AuthMethod = 'google' | 'microsoft' | 'email'

/**
 * Get the authentication method configured for a tenant
 */
export async function getTenantAuthMethod(subdomain: string): Promise<AuthMethod> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('auth_method')
    .eq('subdomain', subdomain)
    .single()

  if (error || !data) {
    console.log('[Auth] Tenant not found or error, defaulting to email:', subdomain)
    return 'email' // Safe default
  }

  return data.auth_method as AuthMethod
}

/**
 * Check if a subdomain exists and return tenant info
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{
  available: boolean
  tenant?: { id: string; auth_method: AuthMethod }
}> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('id, auth_method')
    .eq('subdomain', subdomain)
    .single()

  if (error || !data) {
    return { available: true }
  }

  return { 
    available: false,
    tenant: {
      id: data.id,
      auth_method: data.auth_method as AuthMethod
    }
  }
}
