'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-6">
                <AlertTriangle className="h-16 w-16 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              Application Error
            </h1>

            {/* Description */}
            <p className="text-gray-600 mb-8">
              We encountered a critical error. Please refresh the page to try again.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-700 break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
