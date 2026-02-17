import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { scanPendingFiles } from '@/lib/inngest/functions/scan-files'
import { sendInvoiceReminders } from '@/lib/inngest/functions/invoice-reminders'

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
    sendInvoiceReminders, // Send invoice reminders 5 days before billing
  ],
  servePath: '/api/inngest',
})
