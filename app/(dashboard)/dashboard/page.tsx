import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Document Control System
        </h2>
        <p className="text-gray-600 mb-4">
          You're successfully authenticated! This is your dashboard.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Phase 1 Complete!</strong> Authentication is working. You can sign in, view this dashboard, and sign out.
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Next up: Document Types configuration in Phase 2.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Your Account
        </h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">User ID</dt>
            <dd className="text-sm text-gray-900 font-mono">{user?.id}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Coming Soon
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Document Types configuration (Phase 2)
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Document creation and management (Phase 3)
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Version control system (Phase 4)
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Approval workflows (Phase 5)
          </li>
        </ul>
      </div>
    </div>
  )
}
