// app/admin/users/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagementTable from './UserManagementTable'

export default async function UsersPage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">
            Manage user roles and access permissions
          </p>
        </div>

        {/* Role Legend */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">User Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full mt-1"></div>
              <div>
                <p className="font-semibold text-sm">Admin</p>
                <p className="text-xs text-gray-600">Full system access, can manage users</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
              <div>
                <p className="font-semibold text-sm">Normal</p>
                <p className="text-xs text-gray-600">Create and edit own documents</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
              <div>
                <p className="font-semibold text-sm">Read Only</p>
                <p className="text-xs text-gray-600">View documents only, cannot create</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full mt-1"></div>
              <div>
                <p className="font-semibold text-sm">Deactivated</p>
                <p className="text-xs text-gray-600">No access to system</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <UserManagementTable />
      </div>
    </div>
  )
}
