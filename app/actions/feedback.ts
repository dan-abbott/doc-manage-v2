'use server'

// TEMPORARY: Commented out until resend package is installed
// import { resend, FEEDBACK_EMAIL, FROM_EMAIL } from '@/lib/resend'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export type FeedbackType = 'bug' | 'feature' | 'general'

export interface FeedbackData {
  type: FeedbackType
  description: string
  url?: string
  userAgent?: string
}

export async function submitFeedback(data: FeedbackData) {
  try {
    // Get current user info
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { 
        success: false, 
        error: 'You must be logged in to submit feedback' 
      }
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email, tenant_id, is_admin')
      .eq('id', user.id)
      .single()

    // Format feedback type for display
    const typeLabels = {
      bug: '🐛 Bug Report',
      feature: '💡 Feature Request',
      general: '💬 General Feedback'
    }

    const typeLabel = typeLabels[data.type] || data.type

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              margin-bottom: 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 6px;
              margin-bottom: 20px;
              border-left: 4px solid #667eea;
            }
            .info-row {
              margin: 8px 0;
            }
            .label {
              font-weight: 600;
              color: #555;
              display: inline-block;
              min-width: 120px;
            }
            .feedback-text {
              background: white;
              padding: 20px;
              border-radius: 6px;
              border-left: 4px solid #764ba2;
              white-space: pre-wrap;
              font-size: 15px;
              line-height: 1.6;
            }
            .metadata {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              font-size: 13px;
              color: #6c757d;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${typeLabel}</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="info-row">
                <span class="label">From:</span>
                <span>${userData?.full_name || 'Unknown User'}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span>${userData?.email || user.email}</span>
              </div>
              <div class="info-row">
                <span class="label">User ID:</span>
                <span>${user.id}</span>
              </div>
              <div class="info-row">
                <span class="label">Admin:</span>
                <span>${userData?.is_admin ? 'Yes' : 'No'}</span>
              </div>
              <div class="info-row">
                <span class="label">Tenant ID:</span>
                <span>${userData?.tenant_id || 'N/A'}</span>
              </div>
              ${data.url ? `
              <div class="info-row">
                <span class="label">Page:</span>
                <span>${data.url}</span>
              </div>
              ` : ''}
            </div>

            <div class="feedback-text">
              ${escapeHtml(data.description)}
            </div>

            ${data.userAgent ? `
            <div class="metadata">
              <strong>Browser:</strong> ${escapeHtml(data.userAgent)}
            </div>
            ` : ''}
            
            <div class="metadata">
              <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
                dateStyle: 'full', 
                timeStyle: 'long' 
              })}
            </div>
          </div>
        </body>
      </html>
    `

    // TEMPORARY: Log feedback instead of sending email until resend is installed
    logger.info('Feedback submitted (not emailed - resend not installed)', {
      userId: user.id,
      userEmail: userData?.email || user.email,
      userName: userData?.full_name || 'Unknown User',
      type: data.type,
      description: data.description,
      url: data.url,
      userAgent: data.userAgent,
    })
    
    // TODO: Uncomment when resend package is properly installed
    // const emailResult = await resend.emails.send({
    //   from: FROM_EMAIL,
    //   to: FEEDBACK_EMAIL,
    //   subject: `${typeLabel} - ${userData?.full_name || 'User'}`,
    //   html: emailHtml,
    //   replyTo: userData?.email || user.email,
    // })
    //
    // if (emailResult.error) {
    //   logger.error('Failed to send feedback email', { 
    //     error: emailResult.error,
    //     userId: user.id 
    //   })
    //   
    //   return { 
    //     success: false, 
    //     error: 'Failed to send feedback. Please try again.' 
    //   }
    // }

    return { 
      success: true,
      message: 'Thank you for your feedback! We\'ll review it soon.'
    }

  } catch (error) {
    logger.error('Error submitting feedback', { error })
    
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }
  }
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
