'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { changeDocumentOwner } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

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
  const router = useRouter()

  const handleChange = async () => {
    if (!newOwnerEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    if (newOwnerEmail.toLowerCase().trim() === currentOwnerEmail.toLowerCase()) {
      toast.error('This user is already the owner')
      return
    }

    setIsChanging(true)

    const result = await changeDocumentOwner(documentId, newOwnerEmail.trim())

    if (result.success) {
      toast.success(`Owner changed to ${result.newOwnerEmail}`)
      setNewOwnerEmail('')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to change owner')
    }

    setIsChanging(false)
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-900">
          <ShieldCheck className="h-4 w-4" />
          Change Document Owner
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="h-3 w-3" />
          <span>Transfer ownership to another user</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="currentOwner" className="text-sm font-medium">
            Current Owner
          </Label>
          <div className="mt-1 px-3 py-2 bg-white rounded border text-sm text-gray-700">
            {currentOwnerEmail}
          </div>
        </div>

        <div>
          <Label htmlFor="newOwnerEmail" className="text-sm font-medium">
            New Owner Email
          </Label>
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
              variant="destructive"
              size="sm"
            >
              {isChanging ? 'Changing...' : 'Change'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
