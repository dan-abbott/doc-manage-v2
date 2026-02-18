/**
 * Dynamic Authentication Landing Page
 * app/(auth)/page.tsx
 * 
 * Shows different auth methods based on tenant's configuration
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantAuthMethod } from '@/lib/auth/get-tenant-auth-method'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import MicrosoftSignInButton from '@/components/auth/MicrosoftSignInButton'
import EmailPasswordForm from '@/components/auth/EmailPasswordForm'


// Helper to get subdomain from headers
function getSubdomain(headers: Headers): string {
  const host = headers.get('host') || ''
  const subdomain = host.split('.')[0]
  return subdomain === 'localhost:3000' ? 'app' : subdomain
}

export default async function AuthPage() {
  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  // Get current subdomain and tenant's auth method
  const subdomain = getSubdomain(await import('next/headers').then(m => m.headers()))
  const authMethod = await getTenantAuthMethod(subdomain)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BaselineDocs</h1>
          <p className="text-gray-600 mt-2">Document Control System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Sign In
          </h2>

          {/* Dynamic Auth Method */}
          <div className="space-y-4">
            {authMethod === 'google' && <GoogleSignInButton />}
            {authMethod === 'microsoft' && <MicrosoftSignInButton />}
            {authMethod === 'email' && <EmailPasswordForm />}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help? <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact Support</a>
            </p>
          </div>
        </div>

        {/* New Account Link */}
        {subdomain === 'app' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Create one
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
