'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name: string | null
}

interface ApproverSelectorProps {
  selectedApprovers: User[]
  onApproversChange: (approvers: User[]) => void
  disabled?: boolean
}

export function ApproverSelector({ 
  selectedApprovers, 
  onApproversChange,
  disabled = false 
}: ApproverSelectorProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient()
      
      // Get current user to exclude them
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Get all users except current user
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .neq('id', currentUser?.id || '')
        .order('email')

      if (!error && users) {
        setAvailableUsers(users)
      }
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const filteredUsers = availableUsers.filter(user => {
    // Filter out already selected users
    if (selectedApprovers.some(a => a.id === user.id)) {
      return false
    }
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        user.email.toLowerCase().includes(search) ||
        user.full_name?.toLowerCase().includes(search)
      )
    }
    
    return true
  })

  const handleSelectUser = (user: User) => {
    onApproversChange([...selectedApprovers, user])
    setSearchTerm('')
    setShowDropdown(false)
  }

  const handleRemoveApprover = (userId: string) => {
    onApproversChange(selectedApprovers.filter(a => a.id !== userId))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Approvers (Optional)
      </label>
      
      {/* Selected Approvers */}
      {selectedApprovers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedApprovers.map(approver => (
            <div
              key={approver.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{approver.email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveApprover(approver.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Approver Dropdown */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search users to add as approvers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Dropdown */}
          {showDropdown && !loading && filteredUsers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium">{user.email}</div>
                  {user.full_name && (
                    <div className="text-sm text-gray-500">{user.full_name}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showDropdown && !loading && searchTerm && filteredUsers.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
              No users found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Helper text */}
      <p className="text-sm text-gray-500">
        {selectedApprovers.length === 0 
          ? 'No approvers assigned. Prototype documents can be released directly without approval.'
          : `${selectedApprovers.length} approver${selectedApprovers.length > 1 ? 's' : ''} selected. Document will require approval before release.`
        }
      </p>
    </div>
  )
}
