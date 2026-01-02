import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain from hostname
  // Examples:
  // - app.baselinedocs.com -> 'app'
  // - acme.baselinedocs.com -> 'acme'
  // - localhost:3000 -> 'localhost' (development)
  // - baselinedocs.com -> null (apex domain)
  
  const subdomain = extractSubdomain(hostname)
  
  // Store subdomain in cookie for auth callback
  const response = NextResponse.next()
  
  if (subdomain && subdomain !== 'www') {
    response.cookies.set('tenant_subdomain', subdomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
  }
  
  return response
}

/**
 * Extract subdomain from hostname
 * Handles various cases:
 * - Production: acme.baselinedocs.com -> 'acme'
 * - Development: localhost:3000 -> 'app' (default)
 * - Apex domain: baselinedocs.com -> 'app' (default)
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Development: localhost or 127.0.0.1
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'app' // Default to 'app' subdomain in development
  }
  
  // Split by dots
  const parts = host.split('.')
  
  // Apex domain (baselinedocs.com) - default to 'app'
  if (parts.length === 2) {
    return 'app'
  }
  
  // Subdomain present (acme.baselinedocs.com)
  if (parts.length >= 3) {
    return parts[0]
  }
  
  return null
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
