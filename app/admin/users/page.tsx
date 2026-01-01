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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">Manage user roles and permissions</p>
        </div>

        <UserManagementTable />
      </div>
    </div>
  )
}
