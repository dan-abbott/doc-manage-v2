/**
 * Login Page — BaselineDocs
 * Rebranded per ClearStride brand guide v1.0
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTenantAuthMethod } from '@/lib/auth/get-tenant-auth-method'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import MicrosoftSignInButton from '@/components/auth/MicrosoftSignInButton'
import EmailPasswordForm from '@/components/auth/EmailPasswordForm'
import { BaselineDocsLogoLight, BaselineDocsIconLight, ClearStrideIcon } from '@/components/dashboard/BaselineDocsLogo'
import Image from 'next/image'
import Link from 'next/link'

export default async function LandingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  const cookieStore = cookies()
  const tenantSubdomain = cookieStore.get('tenant_subdomain')?.value

  let tenant = null
  if (tenantSubdomain) {
    const { data } = await supabase
      .from('tenants')
      .select('company_name, logo_url')
      .eq('subdomain', tenantSubdomain)
      .single()
    tenant = data
  }

  const authMethod = await getTenantAuthMethod(tenantSubdomain || 'app')

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — Dark Slate brand panel ─────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#1E293B' }}
      >
        {/* Logo */}
        <div>
          <BaselineDocsLogoLight className="h-8" />
        </div>

        {/* Feature list */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Document control built for quality teams.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Version control, multi-approver workflows, and complete audit trails — purpose-built for ISO-aligned organizations.
            </p>
          </div>

          <div className="space-y-5">
            {[
              'Automated document numbering & versioning',
              'Multi-approver workflows with full audit trail',
              'Prototype to Production document promotion',
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 mt-0.5 flex items-center justify-center h-5 w-5 rounded-full"
                  style={{ backgroundColor: '#2563EB' }}
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <p className="text-slate-300 text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ClearStride ecosystem footer */}
        <div className="flex items-center gap-2">
          <ClearStrideIcon className="h-4 w-4 flex-shrink-0" />
          <span className="text-slate-500 text-xs">Part of ClearStride Tools</span>
        </div>
      </div>

      {/* ── Right panel — auth form ──────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 py-12"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="w-full max-w-sm">

          {/* Mobile-only logo — icon on Dark Slate tile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div
              className="flex items-center justify-center h-14 w-14 rounded-xl"
              style={{ backgroundColor: '#1E293B' }}
            >
              <BaselineDocsIconLight className="h-9 w-9" />
            </div>
          </div>

          {/* Tenant branding */}
          {tenant?.logo_url ? (
            <div className="flex flex-col items-center mb-8">
              <div className="relative h-14 w-40 mb-3">
                <Image
                  src={tenant.logo_url}
                  alt={`${tenant.company_name} logo`}
                  fill
                  className="object-contain"
                />
              </div>
              {tenant.company_name && (
                <p className="text-sm font-medium text-slate-500">
                  {tenant.company_name} · BaselineDocs
                </p>
              )}
            </div>
          ) : tenant?.company_name ? (
            <div className="text-center mb-8">
              <p className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                {tenant.company_name}
              </p>
              <p className="text-sm text-slate-500 mt-1">BaselineDocs</p>
            </div>
          ) : null}

          {/* Sign in heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#1E293B' }}>
              Sign in
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              to your BaselineDocs workspace
            </p>
          </div>

          {/* Auth method */}
          <div className="space-y-3">
            {authMethod === 'google' && <GoogleSignInButton />}
            {authMethod === 'microsoft' && <MicrosoftSignInButton />}
            {authMethod === 'email' && <EmailPasswordForm />}
          </div>

          {/* Footer links */}
          <div className="mt-12 text-center space-y-3">
            <div className="flex justify-center gap-4 text-xs text-slate-400">
              <Link href="/terms" className="hover:text-slate-600 transition-colors">
                Terms of Service
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy" className="hover:text-slate-600 transition-colors">
                Privacy Policy
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} ClearStride Tools. All rights reserved.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
