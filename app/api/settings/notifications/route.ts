import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const {
      approval_requested,
      approval_completed,
      document_rejected,
      document_released,
      delivery_mode,  // NEW
      digest_time,  // NEW
    } = body

    // Validate booleans
    if (
      typeof approval_requested !== 'boolean' ||
      typeof approval_completed !== 'boolean' ||
      typeof document_rejected !== 'boolean' ||
      typeof document_released !== 'boolean' ||
      !['immediate', 'digest'].includes(delivery_mode) ||  // NEW
      typeof digest_time !== 'string'  // NEW
    ) {
      return NextResponse.json({ error: 'Invalid preferences format' }, { status: 400 })
    }


    // Update or insert preferences
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        tenant_id: ...,
        approval_requested,
        approval_completed,
        document_rejected,
        document_released,
        delivery_mode,  // NEW
        digest_time,  // NEW
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tenant_id'
      })

    if (error) {
      console.error('[Notifications API] Update error:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    console.log(`[Notifications API] Updated preferences for user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully'
    })
  } catch (error: any) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get preferences
    const { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Notifications API] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // Return defaults if no preferences found
    if (!preferences) {
      return NextResponse.json({
        success: true,
        preferences: {
          approval_requested: true,
          approval_completed: true,
          document_rejected: true,
          document_released: true,
        }
      })
    }

    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error: any) {
    console.error('[Notifications API] Error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
