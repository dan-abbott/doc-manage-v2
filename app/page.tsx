import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SignInButton from '@/components/SignInButton'
import Image from 'next/image'
import Link from 'next/link'

export default async function LandingPage() {
  const supabase = await createClient()

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  // Get tenant info from cookie
  const cookieStore = cookies()
  const tenantSubdomain = cookieStore.get('tenant_subdomain')?.value

  console.log('[Landing] Subdomain from cookie:', tenantSubdomain)

  let tenant = null
  let error = null

  if (tenantSubdomain) {
    const { data, error: fetchError } = await supabase
      .from('tenants')
      .select('company_name, logo_url, primary_color, secondary_color')
      .eq('subdomain', tenantSubdomain)
      .single()

    tenant = data
    error = fetchError

    console.log('[Landing] Tenant lookup:', {
      subdomain: tenantSubdomain,
      tenant,
      error
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {/* Logos */}
          <div className="flex flex-col items-center mb-8">
            {/* Baseline Docs Logo - STATIC COLORS */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className="h-24 w-24 mb-4">
              <rect x="100" y="80" width="200" height="240" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
              <path d="M 300 80 L 300 120 L 260 120 Z" fill="#2E7DB5"/>
              <path d="M 260 120 L 300 120 L 300 80" fill="none" stroke="#2E7DB5" strokeWidth="8" strokeLinejoin="miter"/>
              <rect x="130" y="130" width="90" height="8" rx="4" fill="#2E7DB5"/>
              <rect x="130" y="160" width="140" height="8" rx="4" fill="#2E7DB5"/>
              <rect x="130" y="190" width="140" height="8" rx="4" fill="#6B7280"/>
              <rect x="130" y="220" width="90" height="8" rx="4" fill="#6B7280"/>
              <rect x="80" y="240" width="240" height="12" rx="6" fill="#1E3A5F"/>
              <path d="M 200 250 L 190 280 L 200 290 L 210 280 Z" fill="#2E7DB5"/>
              <rect x="110" y="280" width="180" height="40" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
            </svg>

            <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
              Baseline Docs
            </h1>

            {/* Company Logo and Name */}
            {tenant?.logo_url && (
              <div className="flex flex-col items-center mt-4 mb-2">
                <div className="relative h-16 w-48 mb-2">
                  <Image
                    src={tenant.logo_url}
                    alt="Company logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            {tenant?.company_name && (
              <p className="text-2xl font-semibold text-center mb-4" style={{ color: 'var(--primary-color, #2563eb)' }}>
                {tenant.company_name}
              </p>
            )}

            <p className="text-gray-600 text-center">
              Professional Document Control & Version Management
            </p>
          </div>

          {/* Sign In Button */}
          <SignInButton />

          {/* Features */}
          <div className="mt-8 space-y-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--primary-color, #2563eb)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-600">Complete version control with automated numbering</p>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--primary-color, #2563eb)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-600">Multi-approver workflows with audit trails</p>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5" style={{ color: 'var(--primary-color, #2563eb)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-600">Prototype to Production document promotion</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm space-y-2">
          <div className="flex justify-center gap-4">
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p>&copy; 2025 Baseline Docs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
