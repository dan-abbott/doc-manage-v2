/**
 * Sign Out Button for Error Page
 * app/auth/error/SignOutButton.tsx
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    await supabase.auth.signOut()
    
    // Redirect to login page after sign out
    window.location.href = '/'
  }

  return (
    <Button 
      onClick={handleSignOut} 
      className="w-full" 
      variant="default"
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Signing out...
        </div>
      ) : (
        'Sign Out and Return to Login'
      )}
    </Button>
  )
}
