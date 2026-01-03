import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthError({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const message = searchParams.message || 'Authentication error occurred'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-4">
              <svg
                className="h-12 w-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full" variant="default">
                Return to Sign In
              </Button>
            </Link>
            
            <p className="text-center text-sm text-gray-500">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>&copy; 2025 Baseline Docs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
