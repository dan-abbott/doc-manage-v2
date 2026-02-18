import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname)
  
  console.log('[Middleware] hostname:', hostname, '→ subdomain:', subdomain, 'path:', pathname)
  
  // Store subdomain in cookie for auth callback
  const response = NextResponse.next()
  
  if (subdomain) {
    response.cookies.set('tenant_subdomain', subdomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain: '.baselinedocs.com',
    })
  }

  // Skip tenant verification for:
  // - Landing page (/)
  // - Auth routes (/auth/*)
  // - Public pages (terms, privacy, help)
  // - Static files
  if (
    pathname === '/' || 
    pathname.startsWith('/auth/') || 
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/_next')
  ) {
    return response
  }

  // For authenticated routes, verify tenant access
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Get user's tenant and master admin status
    const { data: userData, error } = await supabase
      .from('users')
      .select('tenant_id, is_master_admin')
      .eq('id', user.id)
      .single()

    // CRITICAL: If user doesn't exist in users table, block access
    if (!userData || error) {
      console.log('[Middleware] 🚨 SECURITY: User not found in users table:', user.email)
      
      const redirectUrl = new URL('/auth/error', request.url)
      redirectUrl.searchParams.set('message', 'Account setup incomplete. Please contact support.')
      return NextResponse.redirect(redirectUrl)
    }

    // CRITICAL: If user has no tenant_id, block access
    if (!userData.tenant_id) {
      console.log('[Middleware] 🚨 SECURITY: User has no tenant_id:', user.email)
      
      const redirectUrl = new URL('/auth/error', request.url)
      redirectUrl.searchParams.set('message', 'No organization assigned. Please contact support.')
      return NextResponse.redirect(redirectUrl)
    }

    // Get tenant subdomain
    const { data: tenant } = await supabase
      .from('tenants')
      .select('subdomain')
      .eq('id', userData.tenant_id)
      .single()

    const userTenantSubdomain = tenant?.subdomain

    // CRITICAL: If tenant doesn't exist, block access
    if (!userTenantSubdomain) {
      console.log('[Middleware] 🚨 SECURITY: Tenant not found for user:', user.email)
      
      const redirectUrl = new URL('/auth/error', request.url)
      redirectUrl.searchParams.set('message', 'Organization not found. Please contact support.')
      return NextResponse.redirect(redirectUrl)
    }

    console.log('[Middleware] User tenant:', userTenantSubdomain, 'Current subdomain:', subdomain, 'Master admin:', userData.is_master_admin)

    // Master admin can access any tenant
    if (userData.is_master_admin) {
      console.log('[Middleware] ✅ Master admin - access granted to all tenants')
      return response
    }

    // Regular users: verify they're accessing their assigned tenant
    if (userTenantSubdomain !== subdomain) {
      console.log('[Middleware] 🚨 TENANT MISMATCH - User belongs to:', userTenantSubdomain, 'but accessing:', subdomain)
      
      // Redirect to their correct tenant or show error
      const redirectUrl = new URL('/auth/error', request.url)
      redirectUrl.searchParams.set('message', `You belong to ${userTenantSubdomain}.baselinedocs.com`)
      return NextResponse.redirect(redirectUrl)
    }

    console.log('[Middleware] ✅ Tenant match - access granted')
  }
  
  return response
}

function extractSubdomain(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Development: localhost or 127.0.0.1
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'app'
  }
  
  // Remove www - treat as apex domain
  const cleanHost = host.replace(/^www\./, '')
  
  // Split by dots
  const parts = cleanHost.split('.')
  
  // Apex domain (baselinedocs.com) - default to 'app'
  if (parts.length === 2) {
    return 'app'
  }
  
  // Subdomain present (acme.baselinedocs.com)
  if (parts.length >= 3) {
    return parts[0]
  }
  
  return 'app'
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
