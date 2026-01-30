import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { scanPendingFiles } from '@/lib/inngest/functions/scan-files'

/**
 * Inngest API endpoint
 * 
 * This endpoint is called by Inngest to:
 * 1. Register functions (on deploy/sync)
 * 2. Execute functions (when events are sent)
 * 
 * URL: https://your-domain.vercel.app/api/inngest
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scanPendingFiles, // Register our scan function
  ],
  servePath: '/api/inngest',
})
