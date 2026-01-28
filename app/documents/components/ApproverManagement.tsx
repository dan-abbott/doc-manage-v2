'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, UserPlus } from 'lucide-react'
import { addApprover, removeApprover } from '@/app/actions/approvals'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string | null
}

interface Approver {
  id: string
  user_id: string
  user_email: string
  status: string
}

interface ApproverManagementProps {
  documentId: string
  approvers: Approver[]
  availableUsers: User[]
  disabled?: boolean
}

export default function ApproverManagement({
  documentId,
  approvers: initialApprovers,
  availableUsers,
  disabled = false
}: ApproverManagementProps) {
  const router = useRouter()
  const [approvers, setApprovers] = useState<Approver[]>(initialApprovers)
  const [showApproverDropdown, setShowApproverDropdown] = useState(false)
  const [approverSearch, setApproverSearch] = useState('')

  // Filter available users (exclude current approvers)
  const approverUserIds = approvers.map(a => a.user_id)
  const filteredUsers = availableUsers.filter(user => {
    // Exclude already selected approvers
    if (approverUserIds.includes(user.id)) return false
    
    // If search term exists, filter by name or email
    if (approverSearch.trim()) {
      const search = approverSearch.toLowerCase()
      const matchesEmail = user.email.toLowerCase().includes(search)
      const matchesName = user.full_name?.toLowerCase().includes(search)
      return matchesEmail || matchesName
    }
    
    return true
  })

  const handleAddApprover = async (user: User) => {
    try {
      const result = await addApprover(documentId, user.id, user.email)
      
      if (result.success) {
        setApprovers([...approvers, {
          id: crypto.randomUUID(),
          user_id: user.id,
          user_email: user.email,
          status: 'Pending'
        }])
        setApproverSearch('')
        setShowApproverDropdown(false)
        toast.success(`Added ${user.email} as approver`)
        // Force full page reload to update button states
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.error(result.error || 'Failed to add approver')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleRemoveApprover = async (approverId: string) => {
    try {
      const result = await removeApprover(documentId, approverId)
      
      if (result.success) {
        setApprovers(approvers.filter(a => a.id !== approverId))
        toast.success('Approver removed')
        // Force full page reload to update button states
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.error(result.error || 'Failed to remove approver')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  return (
    <div>
      <Label>Approvers</Label>
      
      {/* Current Approvers */}
      {approvers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {approvers.map(approver => (
            <div
              key={approver.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{approver.user_email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveApprover(approver.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                  title="Remove approver"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Approver */}
      {!disabled && (
        <div className="relative">
          {/* Click outside to close */}
          {showApproverDropdown && (
            <div
              className="fixed inset-0 z-[5]"
              onClick={() => setShowApproverDropdown(false)}
            />
          )}

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search users to add as approvers..."
              value={approverSearch}
              onChange={(e) => {
                setApproverSearch(e.target.value)
                setShowApproverDropdown(true)
              }}
              onFocus={() => setShowApproverDropdown(true)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowApproverDropdown(!showApproverDropdown)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Dropdown */}
          {showApproverDropdown && (
            <div className="absolute z-[15] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredUsers.length > 0 ? (
                <>
                  <div className="px-3 py-1 text-xs text-gray-500 border-b bg-gray-50">
                    {filteredUsers.length} user{filteredUsers.length > 1 ? 's' : ''} available
                  </div>
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleAddApprover(user)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b last:border-b-0"
                    >
                      {user.full_name ? (
                        <>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </>
                      ) : (
                        <div className="font-medium">{user.email}</div>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-3 py-3 text-sm text-gray-500">
                  {availableUsers.length === 0 ? (
                    <div>
                      <p className="font-medium text-gray-700">No users available</p>
                      <p className="text-xs mt-1">There are no other users in the system yet.</p>
                    </div>
                  ) : approverSearch.trim() ? (
                    <div>
                      <p className="font-medium text-gray-700">No matches found</p>
                      <p className="text-xs mt-1">No users match &quot;{approverSearch}&quot;</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-700">All users already added</p>
                      <p className="text-xs mt-1">All available users are already approvers.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-2">
        {approvers.length === 0 
          ? 'No approvers assigned. Document can be released directly without approval.'
          : `${approvers.length} approver${approvers.length > 1 ? 's' : ''} assigned. Document will require approval before release.`
        }
      </p>
    </div>
  )
}
