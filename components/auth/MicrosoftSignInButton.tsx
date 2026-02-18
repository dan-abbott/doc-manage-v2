/**
 * Microsoft OAuth Sign In Button
 * app/(auth)/MicrosoftSignInButton.tsx
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function MicrosoftSignInButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email',
      },
    })

    if (error) {
      console.error('Error signing in with Microsoft:', error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleMicrosoftSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 23 23">
            <path fill="#f35325" d="M0 0h11v11H0z"/>
            <path fill="#81bc06" d="M12 0h11v11H12z"/>
            <path fill="#05a6f0" d="M0 12h11v11H0z"/>
            <path fill="#ffba08" d="M12 12h11v11H12z"/>
          </svg>
          Continue with Microsoft
        </>
      )}
    </button>
  )
}
