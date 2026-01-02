import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    // Get subdomain from cookie (set by middleware)
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value || 'app'

    console.log('Auth callback - subdomain:', subdomain)

    // Look up tenant by subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant not found for subdomain:', subdomain, tenantError)
      // Fall back to default tenant
      const tenantId = '00000000-0000-0000-0000-000000000001'
      await updateUserTenant(supabase, tenantId)
    } else {
      console.log('Found tenant:', tenant.id)
      await updateUserTenant(supabase, tenant.id)
    }

    // Redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No code present, redirect to home
  return NextResponse.redirect(`${origin}/`)
}

/**
 * Update the user's tenant_id in their app_metadata
 * This is used by the database trigger when creating the user record
 */
async function updateUserTenant(supabase: any, tenantId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No user found in session')
      return
    }

    console.log('Updating user tenant:', user.id, 'to tenant:', tenantId)

    // Update user's app_metadata with tenant_id
    // This will be read by the database trigger when creating the user record
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { 
        tenant_id: tenantId 
      }
    })

    if (error) {
      console.error('Error updating user metadata:', error)
    } else {
      console.log('User metadata updated successfully')
    }
  } catch (error) {
    console.error('Error in updateUserTenant:', error)
  }
}
