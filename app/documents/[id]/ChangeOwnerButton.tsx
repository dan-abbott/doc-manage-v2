'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeDocumentOwner } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface ChangeOwnerButtonProps {
  documentId: string
  currentOwnerEmail: string
}

export default function ChangeOwnerButton({ 
  documentId, 
  currentOwnerEmail 
}: ChangeOwnerButtonProps) {
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  const handleChange = async () => {
    if (!newOwnerEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    if (newOwnerEmail.toLowerCase().trim() === currentOwnerEmail.toLowerCase()) {
      setMessage({ type: 'error', text: 'This user is already the owner' })
      return
    }

    setIsChanging(true)
    setMessage(null)

    const result = await changeDocumentOwner(documentId, newOwnerEmail.trim())

    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: `Owner changed to ${result.newOwnerEmail}` 
      })
      setNewOwnerEmail('')
      // Refresh the page to show updated owner
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } else {
      setMessage({ 
        type: 'error', 
        text: result.error || 'Failed to change owner' 
      })
    }

    setIsChanging(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="currentOwner" className="text-sm">Current Owner</Label>
        <div className="mt-1 px-3 py-2 bg-gray-100 rounded border text-sm text-gray-700">
          {currentOwnerEmail}
        </div>
      </div>

      <div>
        <Label htmlFor="newOwnerEmail" className="text-sm">New Owner Email</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="newOwnerEmail"
            type="email"
            placeholder="user@example.com"
            value={newOwnerEmail}
            onChange={(e) => setNewOwnerEmail(e.target.value)}
            disabled={isChanging}
            className="flex-1"
          />
          <Button 
            onClick={handleChange} 
            disabled={isChanging || !newOwnerEmail.trim()}
            variant="outline"
            className="min-w-[120px]"
          >
            {isChanging ? 'Changing...' : 'Change Owner'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  )
}
