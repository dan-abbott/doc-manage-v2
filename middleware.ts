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

  // Skip middleware checks for:
  // - Auth routes (/auth/*) - these handle their own logic
  // - Static files
  // - API routes
  if (pathname.startsWith('/auth/') || pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return response
  }

  // Get authentication status
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Landing page (/) handling
  if (pathname === '/') {
    if (user) {
      // User is authenticated, redirect to dashboard
      console.log('[Middleware] User authenticated on landing page, redirecting to /dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // User not authenticated, allow them to see landing page
    return response
  }

  // Protected routes (everything except /)
  if (!user) {
    // User not authenticated, redirect to landing page
    console.log('[Middleware] User not authenticated, redirecting to /')
    return NextResponse.redirect(new URL('/', request.url))
  }

  // User is authenticated, verify tenant access
  // Get user's tenant and master admin status
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, is_master_admin')
    .eq('id', user.id)
    .single()

  if (userData) {
    // Get tenant subdomain separately
    const { data: tenant } = await supabase
      .from('tenants')
      .select('subdomain')
      .eq('id', userData.tenant_id)
      .single()

    const userTenantSubdomain = tenant?.subdomain || 'app'

    console.log('[Middleware] User tenant:', userTenantSubdomain, 'Current subdomain:', subdomain, 'Master admin:', userData.is_master_admin)

    // Master admin can access any tenant
    if (userData.is_master_admin) {
      console.log('[Middleware] Master admin - access granted to all tenants')
      return response
    }

    // Regular users: verify they're accessing their assigned tenant
    if (userTenantSubdomain !== subdomain) {
      console.log('[Middleware] TENANT MISMATCH - User belongs to:', userTenantSubdomain, 'but accessing:', subdomain)
      
      // Redirect to error page with message
      const redirectUrl = new URL('/auth/error', request.url)
      redirectUrl.searchParams.set('message', 'You do not have access to this organization')
      return NextResponse.redirect(redirectUrl)
    }

    console.log('[Middleware] Tenant match - access granted')
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
