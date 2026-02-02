/**
 * Cron Job: Send Daily Digest Emails
 * 
 * Runs every hour, checks which users need digests at this time,
 * groups their pending emails, and sends beautiful digest emails
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { generateDigestHTML, generateDigestSubject } from '@/lib/email-digest'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.EMAIL_FROM || 'notifications@baselinedocs.com'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('[Digest Cron] Starting digest job...')
    
    const supabase = createServiceRoleClient()
    
    // Get current time in HH:MM:00 format
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    
    // Only run at the top of each hour (00 minutes)
    if (currentMinute > 5) {
      console.log(`[Digest Cron] Skipping - not top of hour (${currentMinute} minutes)`)
      return NextResponse.json({ 
        success: true, 
        message: 'Skipped - not top of hour',
        time: `${currentHour}:${currentMinute}`
      })
    }
    
    // Format current time for matching (e.g., "08:00:00")
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:00:00`
    
    console.log(`[Digest Cron] Current UTC time: ${currentTimeStr}`)
    
    // Find users who want digests at this time AND have pending emails
    const { data: usersWithDigests, error: usersError } = await supabase
      .from('user_notification_preferences')
      .select(`
        user_id,
        digest_time,
        users!inner(
          id,
          email,
          full_name,
          tenant_id
        )
      `)
      .eq('delivery_mode', 'digest')
      .eq('digest_time', currentTimeStr)
    
    if (usersError) {
      console.error('[Digest Cron] Error fetching users:', usersError)
      return NextResponse.json({ 
        success: false, 
        error: usersError.message 
      }, { status: 500 })
    }
    
    if (!usersWithDigests || usersWithDigests.length === 0) {
      console.log('[Digest Cron] No users found for this time slot')
      return NextResponse.json({ 
        success: true, 
        message: 'No users scheduled for this time',
        time: currentTimeStr,
        duration: Date.now() - startTime
      })
    }
    
    console.log(`[Digest Cron] Found ${usersWithDigests.length} users with digest time ${currentTimeStr}`)
    
    let digestsSent = 0
    let errors = 0
    
    // Process each user
    for (const userPref of usersWithDigests) {
      const user = Array.isArray(userPref.users) ? userPref.users[0] : userPref.users
      
      if (!user || !user.email) {
        console.log(`[Digest] Skipping user ${userPref.user_id} - no email`)
        continue
      }
      
      try {
        // Get pending emails for this user
        const { data: pendingEmails, error: queueError } = await supabase
          .from('email_queue')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
        
        if (queueError) {
          console.error(`[Digest] Error fetching queue for ${user.email}:`, queueError)
          errors++
          continue
        }
        
        if (!pendingEmails || pendingEmails.length === 0) {
          console.log(`[Digest] No pending emails for ${user.email}`)
          continue
        }
        
        console.log(`[Digest] Processing digest for ${user.email} (${pendingEmails.length} notifications)`)
        
        // Format date for email
        const digestDate = now.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        
        // Generate digest email
        const userName = user.full_name || user.email.split('@')[0]
        const subject = generateDigestSubject(pendingEmails.length, digestDate)
        const html = generateDigestHTML(userName, pendingEmails, digestDate)
        
        // Send email
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: subject,
          html: html,
        })
        
        if (!emailResult.data?.id) {
          throw new Error('No email ID returned from Resend')
        }
        
        // Mark all emails as sent
        const emailIds = pendingEmails.map(e => e.id)
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .in('id', emailIds)
        
        if (updateError) {
          console.error(`[Digest] Error marking emails as sent for ${user.email}:`, updateError)
          // Don't fail - email was sent successfully
        }
        
        digestsSent++
        console.log(`[Digest] ✓ Sent digest to ${user.email} (${pendingEmails.length} notifications)`)
        
      } catch (error) {
        console.error(`[Digest] ✗ Failed to send digest to ${user.email}:`, error)
        
        // Mark emails as failed
        try {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: supabase.sql('retry_count + 1'),
            })
            .eq('user_id', user.id)
            .eq('status', 'pending')
        } catch (updateError) {
          console.error(`[Digest] Failed to update error status:`, updateError)
        }
        
        errors++
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log(`[Digest Cron] Completed: ${digestsSent} digests sent, ${errors} errors (${duration}ms)`)
    
    return NextResponse.json({
      success: true,
      digestsSent,
      errors,
      duration,
      time: currentTimeStr,
    })
    
  } catch (error) {
    console.error('[Digest Cron] Fatal error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET(request: Request) {
  return POST(request)
}
