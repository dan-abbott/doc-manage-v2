// Replace app/admin/users/page.tsx with this temporarily
// This will show us exactly what getAllUsers returns

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/app/actions/user-management'

export default async function UsersPageDiagnostic() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/')
  }

  // Check admin status
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/dashboard')
  }

  // Try to get users
  const result = await getAllUsers()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management - Diagnostic</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">getAllUsers() Result:</h2>
          
          <div className="mb-4">
            <strong>Success:</strong> {result.success ? 'true' : 'false'}
          </div>

          {result.success ? (
            <>
              <div className="mb-4">
                <strong>User Count:</strong> {result.data?.length || 0}
              </div>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <div className="mb-4 text-red-600">
                <strong>Error Type:</strong> {typeof result.error}
              </div>
              <div className="mb-4 text-red-600">
                <strong>Error Value:</strong>
              </div>
              <pre className="bg-red-50 p-4 rounded overflow-auto">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            </>
          )}
        </div>

        <div className="mt-4">
          <a href="/admin/users" className="text-blue-600 hover:underline">
            ← Back to User Management (will error)
          </a>
        </div>
      </div>
    </div>
  )
}
