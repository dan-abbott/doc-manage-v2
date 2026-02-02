import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationSettingsClient from './NotificationSettingsClient'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's notification preferences
const { data: preferences } = await supabase
  .from('user_notification_preferences')
  .select('approval_requested, approval_completed, document_rejected, document_released, delivery_mode, digest_time')  // ADDED delivery_mode, digest_time
  .eq('user_id', user.id)
  .single()

  // If no preferences exist, use defaults
  const defaultPreferences = {
  approval_requested: true,
  approval_completed: true,
  document_rejected: true,
  document_released: true,
  delivery_mode: 'immediate',  // NEW
  digest_time: '08:00:00',  // NEW
}

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Email Notifications</h1>
        <p className="text-gray-600 mt-2">
          Choose which email notifications you'd like to receive
        </p>
      </div>

      <NotificationSettingsClient 
        preferences={preferences || defaultPreferences}
      />
    </div>
  )
}
