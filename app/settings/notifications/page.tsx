import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationSettingsClient from './NotificationSettingsClient'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user preferences including delivery_mode and digest_time
  const { data: preferences } = await supabase
    .from('user_notification_preferences')
    .select('approval_requested, approval_completed, document_rejected, document_released, delivery_mode, digest_time')
    .eq('user_id', user.id)
    .single()

  // Default preferences if none exist
  const defaultPreferences = {
    approval_requested: true,
    approval_completed: true,
    document_rejected: true,
    document_released: true,
    delivery_mode: 'immediate' as const,
    digest_time: '01:00:00', // 5 PM PT = 01:00 UTC next day
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Email Notifications</h1>
        <p className="text-gray-600 mt-2">
          Manage how and when you receive email notifications from the Document Control System
        </p>
      </div>

      <NotificationSettingsClient 
        preferences={preferences || defaultPreferences} 
      />
    </div>
  )
}
