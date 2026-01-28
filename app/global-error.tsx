'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry (if DSN configured)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    } else {
      // Fallback to console if Sentry not configured
      console.error('Global error:', error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We've been notified and are looking into it. Please try again.
            </p>
            
            {error.digest && (
              <p className="text-xs text-gray-400 mb-4 font-mono">
                Error ID: {error.digest}
              </p>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => reset()}
                variant="default"
              >
                Try Again
              </Button>
              
              <Button
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 mt-6">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
