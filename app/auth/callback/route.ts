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

    // Get the original subdomain from OAuth cookie (set by SignInButton)
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
      
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=tenant_not_found`)
    }

    console.log('[Auth Callback] Found tenant:', tenant.company_name, tenant.id)

    // Get user's current tenant assignment (or create if doesn't exist)
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('tenant_id, is_master_admin, full_name')
      .eq('id', user.id)
      .single()

    // CRITICAL FIX: Create user record if it doesn't exist
    if (userError && userError.code === 'PGRST116') {
      console.log('[Auth Callback] User record not found, creating...')
      
      // Extract full name from Google OAuth metadata
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User'
      
      // Create user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          tenant_id: tenant.id,
          is_admin: false, // Regular user by default
          is_master_admin: false,
        })
        .select('tenant_id, is_master_admin, full_name')
        .single()
      
      if (createError) {
        console.error('[Auth Callback] Error creating user record:', createError)
        
        if (oauthOriginCookie) {
          cookieStore.delete('oauth_origin_subdomain')
        }
        
        return NextResponse.redirect(`${origin}/auth/error?message=user_creation_failed`)
      }
      
      userRecord = newUser
      console.log('[Auth Callback] Created user record:', userRecord)
    } else if (userError) {
      console.error('[Auth Callback] User lookup error:', userError)
      
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=user_lookup_failed`)
    }

    console.log('[Auth Callback] User record:', {
      tenant_id: userRecord.tenant_id,
      is_master_admin: userRecord.is_master_admin,
      full_name: userRecord.full_name,
      requested_tenant: tenant.id
    })

    // Master admin can access any tenant (skip verification)
    if (userRecord.is_master_admin) {
      console.log('[Auth Callback] Master admin - access granted to all tenants')
      
      // Extract full name from Google OAuth metadata if missing
      const fullName = userRecord.full_name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User'
      
      // Update full_name if it's missing
      if (!userRecord.full_name) {
        await supabase
          .from('users')
          .update({ full_name: fullName })
          .eq('id', user.id)
        
        console.log('[Auth Callback] Updated missing full_name:', fullName)
      }
      
      // Clear the OAuth origin cookie
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      const redirectUrl = `https://${subdomain}.baselinedocs.com/dashboard`
      console.log('[Auth Callback] Redirecting master admin to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }

    // For regular users: verify they belong to this tenant
    if (userRecord.tenant_id !== tenant.id) {
      console.error('[Auth Callback] Tenant mismatch:')
      console.error('[Auth Callback]   User belongs to tenant:', userRecord.tenant_id)
      console.error('[Auth Callback]   Requested tenant:', tenant.id)
      
      if (oauthOriginCookie) {
        cookieStore.delete('oauth_origin_subdomain')
      }
      
      return NextResponse.redirect(`${origin}/auth/error?message=tenant_mismatch`)
    }

    console.log('[Auth Callback] User verified for tenant:', tenant.company_name)

    // Extract full name from Google OAuth metadata
    const fullName = userRecord.full_name || 
                    user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User'

    // Update user's full_name if missing
    if (!userRecord.full_name) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          full_name: fullName,
          email: user.email
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[Auth Callback] Error updating user name:', updateError)
      } else {
        console.log('[Auth Callback] Updated missing full_name:', fullName)
      }
    }

    // Clear the OAuth origin cookie (no longer needed)
    if (oauthOriginCookie) {
      cookieStore.delete('oauth_origin_subdomain')
      console.log('[Auth Callback] Cleaned up OAuth origin cookie')
    }

    // Redirect to the dashboard on the subdomain they logged in from
    const redirectUrl = `https://${subdomain}.baselinedocs.com/dashboard`
    console.log('[Auth Callback] Redirecting to:', redirectUrl)
    
    return NextResponse.redirect(redirectUrl)
  }

  // No code present, redirect to home
  console.log('[Auth Callback] No code - redirecting to home')
  return NextResponse.redirect(`${origin}/`)
}
