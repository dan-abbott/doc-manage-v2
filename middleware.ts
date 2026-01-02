import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname)
  
  console.log('[Middleware] hostname:', hostname, '→ subdomain:', subdomain)
  
  // Store subdomain in cookie for auth callback
  const response = NextResponse.next()
  
  if (subdomain) {
    response.cookies.set('tenant_subdomain', subdomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain: '.baselinedocs.com', // Works for all subdomains
    })
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
