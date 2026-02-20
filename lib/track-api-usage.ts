/**
 * Helper function to track API usage
 * lib/track-api-usage.ts
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function trackApiUsage(params: {
  tenantId: string
  apiType: 'resend_email'
  endpoint?: string
  status?: 'success' | 'error'
  requestData?: Record<string, any>
  responseData?: Record<string, any>
}) {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from('api_usage')
      .insert({
        tenant_id: params.tenantId,
        api_type: params.apiType,
        endpoint: params.endpoint,
        status: params.status || 'success',
        request_data: params.requestData,
        response_data: params.responseData,
      })
    
    if (error) {
      console.error('[API Usage Tracking] Failed to track usage:', error)
    }
  } catch (err) {
    console.error('[API Usage Tracking] Error:', err)
  }
}
