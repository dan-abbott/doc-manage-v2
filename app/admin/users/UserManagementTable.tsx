'use client'

import { useEffect, useState } from 'react'
import { getAllUsers, updateUserRole, type UserRole } from '@/app/actions/user-management'
import { toast } from 'sonner'

interface UserData {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  role: UserRole | null
  is_active: boolean
  created_at: string
  document_count: number
  approval_count: number
}

export default function UserManagementTable() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const result = await getAllUsers()
      
      console.log('[UserManagementTable] Result:', result)
      
      if (result.success) {
        console.log('[UserManagementTable] Users loaded:', result.data.length)
        setUsers(result.data)
      } else {
        console.error('[UserManagementTable] Failed:', result.error)
        const error = result.error as any
        const errorMessage = typeof error === 'string' 
          ? error 
          : error?.message || 'Unknown error'
        
        toast.error('Failed to Load Users', {
          description: errorMessage
        })
      }
    } catch (error) {
      console.error('[UserManagementTable] Exception:', error)
      toast.error('Failed to Load Users', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">User List ({users.length} users)</h2>
        
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="border rounded p-4">
              <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-sm mt-2">
                <span className="font-medium">Role:</span> {user.role || 'No role'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Admin:</span> {user.is_admin ? 'Yes' : 'No'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Documents:</span> {user.document_count}
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found
          </div>
        )}
      </div>
    </div>
  )
}
