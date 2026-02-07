import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('[Auth Callback] START - origin:', origin, 'has code:', !!code)

  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Exchange code for session
    console.log('[Auth Callback] Exchanging code for session...')
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] Exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    console.log('[Auth Callback] Session established')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[Auth Callback] No user found after auth')
      return NextResponse.redirect(`${origin}/`)
    }

    console.log('[Auth Callback] User:', user.email)

    // CRITICAL FIX: Get the original subdomain from OAuth cookie (set by SignInButton)
    const oauthOriginCookie = cookieStore.get('oauth_origin_subdomain')
    let subdomain = oauthOriginCookie?.value
    
    console.log('[Auth Callback] OAuth origin subdomain from cookie:', subdomain)

    // Fallback to middleware cookie if OAuth cookie not present
    if (!subdomain) {
      const tenantCookie = cookieStore.get('tenant_subdomain')
      subdomain = tenantCookie?.value
      console.log('[Auth Callback] Fallback to tenant cookie:', subdomain)
    }

    // Final fallback to 'app'
    if (!subdomain) {
      subdomain = 'app'
      console.log('[Auth Callback] Using default subdomain: app')
    }

    console.log('[Auth Callback] Final subdomain:', subdomain)

    // Look up tenant by subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, company_name, subdomain')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      console.log('[Auth Callback] Tenant not found for subdomain:', subdomain)
      console.error('[Auth Callback] Tenant error:', tenantError)
      
      // Clear the OAuth origin cookie
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      // If using default 'app' subdomain, allow it (backward compatibility)
      if (subdomain === 'app') {
        console.log('[Auth Callback] Using default tenant for app subdomain')
        const tenantId = '00000000-0000-0000-0000-000000000001'
        
        // Update user's tenant_id
        const { error: updateError } = await supabase
          .from('users')
          .update({ tenant_id: tenantId })
          .eq('id', user.id)

        if (updateError) {
          console.error('[Auth Callback] Error updating user tenant:', updateError)
        } else {
          console.log('[Auth Callback] User tenant updated to default:', user.email, '→', tenantId)
        }
        
        const redirectUrl = `https://app.baselinedocs.com/dashboard`
        console.log('[Auth Callback] Redirecting to default:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=tenant_not_found`)
    }

    console.log('[Auth Callback] Found tenant:', tenant.company_name, tenant.id)

    // Get user's current tenant assignment
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('tenant_id, is_master_admin')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      console.error('[Auth Callback] User record not found:', userError)
      
      // Clear the OAuth origin cookie
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=user_not_found`)
    }

    console.log('[Auth Callback] User record:', {
      tenant_id: userRecord.tenant_id,
      is_master_admin: userRecord.is_master_admin,
      requested_tenant: tenant.id
    })

    // Master admin can access any tenant (skip verification)
    if (userRecord.is_master_admin) {
      console.log('[Auth Callback] Master admin - access granted to all tenants')
      
      // Clear the OAuth origin cookie
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      const redirectUrl = `https://${tenant.subdomain}.baselinedocs.com/dashboard`
      console.log('[Auth Callback] Redirecting master admin to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }

    // For regular users: verify they belong to this tenant
    if (userRecord.tenant_id !== tenant.id) {
      console.error('[Auth Callback] Tenant mismatch:')
      console.error('[Auth Callback]   User belongs to tenant:', userRecord.tenant_id)
      console.error('[Auth Callback]   Requested tenant:', tenant.id)
      
      // Clear the OAuth origin cookie
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=tenant_mismatch`)
    }

    console.log('[Auth Callback] User verified for tenant:', tenant.company_name)

    // Update user's tenant_id (should already match, but ensure consistency)
    const { error: updateError } = await supabase
      .from('users')
      .update({ tenant_id: tenant.id })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Auth Callback] Error updating user tenant:', updateError)
    } else {
      console.log('[Auth Callback] User tenant confirmed:', user.email, '→', tenant.id)
    }

    // Clear the OAuth origin cookie (no longer needed)
    if (oauthOriginCookie) {
      cookieStore.delete('oauth_origin_subdomain')
      console.log('[Auth Callback] Cleaned up OAuth origin cookie')
    }

    // CRITICAL FIX: Redirect to the ORIGINAL subdomain, not the current origin
    const redirectUrl = `https://${tenant.subdomain}.baselinedocs.com/dashboard`
    console.log('[Auth Callback] Redirecting to original subdomain:', redirectUrl)
    
    return NextResponse.redirect(redirectUrl)
  }

  // No code present, redirect to home
  console.log('[Auth Callback] No code - redirecting to home')
  return NextResponse.redirect(`${origin}/`)
}
