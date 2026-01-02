import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/auth/SignInButton'
import { cookies } from 'next/headers'

export default async function LandingPage() {
  const supabase = await createClient()
  
  // Check if user is already authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }

  // Get subdomain from cookie (set by middleware)
  const cookieStore = cookies()
  const subdomainCookie = cookieStore.get('tenant_subdomain')
  const subdomain = subdomainCookie?.value || 'app'

  // Get tenant info if not default
  let tenantName = null
  if (subdomain && subdomain !== 'app') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('company_name')
      .eq('subdomain', subdomain)
      .single()
    
    tenantName = tenant?.company_name
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className="h-24 w-24">
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
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Baseline Docs
            </h1>
            {tenantName && (
              <p className="text-xl text-blue-600 font-semibold mb-2">
                {tenantName}
              </p>
            )}
            <p className="text-gray-600">
              Professional Document Control & Version Management
            </p>
          </div>

          {/* Sign In Button */}
          <div className="mb-6">
            <SignInButton />
          </div>

          {/* Features */}
          <div className="pt-6 border-t border-gray-200">
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Automated document numbering & version control</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Multi-approver workflows & audit trails</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Prototype to production promotion</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>&copy; 2025 Baseline Docs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
