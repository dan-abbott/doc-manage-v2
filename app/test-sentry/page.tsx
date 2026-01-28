'use client'

import { Button } from '@/components/ui/button'

export default function TestSentryPage() {
  const triggerError = () => {
    throw new Error('Test Sentry Error - ' + new Date().toISOString())
  }

  const triggerServerError = async () => {
    const response = await fetch('/api/test-sentry-error')
    const data = await response.json()
    console.log(data)
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Sentry Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Client-Side Error Test</h2>
          <p className="text-gray-600 mb-4">
            This will trigger a client-side error that Sentry should capture.
          </p>
          <Button onClick={triggerError} variant="destructive">
            Trigger Client Error
          </Button>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Server-Side Error Test</h2>
          <p className="text-gray-600 mb-4">
            This will trigger a server-side error that Sentry should capture.
          </p>
          <Button onClick={triggerServerError} variant="destructive">
            Trigger Server Error
          </Button>
        </div>

        <div className="p-4 border rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold mb-2">Check Sentry Status</h2>
          <p className="text-sm text-gray-600 mb-2">
            <strong>DSN Set:</strong> {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Yes' : '❌ No'}
          </p>
          <p className="text-sm text-gray-600">
            If DSN is not set, add <code className="bg-white px-2 py-1 rounded">NEXT_PUBLIC_SENTRY_DSN</code> to your Vercel environment variables.
          </p>
        </div>
      </div>
    </div>
  )
}
