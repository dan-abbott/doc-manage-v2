import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignInButton } from '@/components/auth/SignInButton'

export default async function LandingPage() {
  const supabase = await createClient()
  
  // Check if user is already authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Baseline Docs
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional Document Control & Version Management
          </p>
          <div className="flex justify-center gap-4">
            <div className="w-full max-w-sm">
              <SignInButton />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon="📄"
            title="Document Control"
            description="Create, manage, and track documents with automated numbering and version control"
          />
          <FeatureCard
            icon="✅"
            title="Approval Workflows"
            description="Multi-approver workflows ensure proper review and authorization before release"
          />
          <FeatureCard
            icon="🔒"
            title="Audit Trail"
            description="Complete history of all document changes, approvals, and releases for compliance"
          />
          <FeatureCard
            icon="📊"
            title="Version Management"
            description="Track document revisions with automatic versioning (vA, vB, v1, v2)"
          />
          <FeatureCard
            icon="🏢"
            title="Multi-Tenant"
            description="Secure data isolation for each organization with custom branding"
          />
          <FeatureCard
            icon="🚀"
            title="Production Ready"
            description="Promote prototype documents to production with full approval workflow"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-600">
          <p>&copy; 2025 Baseline Docs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string, title: string, description: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
