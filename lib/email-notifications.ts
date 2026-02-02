/**
 * Email Notification Service - Phase 1
 * 
 * Sends immediate email notifications using Resend
 * Respects user notification preferences
 */

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.EMAIL_FROM || 'notifications@baselinedocs.com'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.baselinedocs.com'

interface EmailContext {
  documentNumber: string
  documentVersion: string
  documentTitle: string
  documentId: string
  submittedBy?: string
  rejectedBy?: string
  rejectionReason?: string
}

/**
 * Check if user should receive this notification
 */
async function shouldNotify(
  userId: string,
  notificationType: 'approval_requested' | 'approval_completed' | 'document_rejected' | 'document_released'
): Promise<{ send: boolean; email: string | null; userName: string }> {
  const supabase = await createClient()

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!user?.email) {
    return { send: false, email: null, userName: '' }
  }

  // Get user preferences - select all fields
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('approval_requested, approval_completed, document_rejected, document_released')
    .eq('user_id', userId)
    .single()

  // If no preferences, use defaults (all enabled)
  const enabled = prefs ? (prefs as any)[notificationType] ?? true : true

  return {
    send: enabled,
    email: user.email,
    userName: user.full_name || user.email.split('@')[0]
  }
}

/**
 * 1. Approval Request Email
 * Sent when user is assigned as approver
 */
export async function sendApprovalRequestEmail(
  approverId: string,
  context: EmailContext
) {
  const check = await shouldNotify(approverId, 'approval_requested')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping approval request for ${approverId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const viewUrl = `${siteUrl}/documents?selected=${context.documentNumber}&version=${context.documentVersion}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `⏳ Approval Needed: ${context.documentNumber}${context.documentVersion}`,
      html: generateApprovalRequestHTML(check.userName, context, viewUrl),
    })

    console.log(`[Email] ✓ Sent approval request to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send approval request:', error)
    return { success: false, reason: 'error', error }
  }
}

/**
 * 2. Approval Completed Email
 * Sent when all approvers have approved
 */
export async function sendApprovalCompletedEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'approval_completed')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping approval completed for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const viewUrl = `${siteUrl}/documents?selected=${context.documentNumber}&version=${context.documentVersion}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `✅ Approved: ${context.documentNumber}${context.documentVersion}`,
      html: generateApprovalCompletedHTML(check.userName, context, viewUrl),
    })

    console.log(`[Email] ✓ Sent approval completed to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send approval completed:', error)
    return { success: false, reason: 'error', error }
  }
}

/**
 * 3. Document Rejected Email
 * Sent when any approver rejects
 */
export async function sendDocumentRejectedEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'document_rejected')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping document rejected for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const editUrl = `${siteUrl}/documents/${context.documentId}/edit`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `❌ Rejected: ${context.documentNumber}${context.documentVersion}`,
      html: generateDocumentRejectedHTML(check.userName, context, editUrl),
    })

    console.log(`[Email] ✓ Sent document rejected to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send document rejected:', error)
    return { success: false, reason: 'error', error }
  }
}

/**
 * 4. Document Released Email
 * Sent when document is released (creator only)
 */
export async function sendDocumentReleasedEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'document_released')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping document released for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const viewUrl = `${siteUrl}/documents?selected=${context.documentNumber}&version=${context.documentVersion}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `📄 Released: ${context.documentNumber}${context.documentVersion}`,
      html: generateDocumentReleasedHTML(check.userName, context, viewUrl),
    })

    console.log(`[Email] ✓ Sent document released to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send document released:', error)
    return { success: false, reason: 'error', error }
  }
}

// ============================================================================
// HTML Email Templates
// ============================================================================

function generateApprovalRequestHTML(userName: string, context: EmailContext, viewUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">⏳ Approval Needed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${userName},</p>
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">A document has been submitted for your review:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #667eea; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 8px; color: #667eea; font-size: 20px;">${context.documentNumber}${context.documentVersion}</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">${context.documentTitle}</p>
                    ${context.submittedBy ? `<p style="margin: 12px 0 0; color: #9ca3af; font-size: 14px;">Submitted by: ${context.submittedBy}</p>` : ''}
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${viewUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review & Approve →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">BaselineDocs - <a href="${siteUrl}/settings/notifications" style="color: #667eea;">Manage preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateApprovalCompletedHTML(userName: string, context: EmailContext, viewUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">✅ Document Approved!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${userName},</p>
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Great news! Your document has been approved and is now released:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 8px; color: #10b981; font-size: 20px;">${context.documentNumber}${context.documentVersion}</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">${context.documentTitle}</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${viewUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Document →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">BaselineDocs - <a href="${siteUrl}/settings/notifications" style="color: #10b981;">Manage preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateDocumentRejectedHTML(userName: string, context: EmailContext, editUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">❌ Document Rejected</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${userName},</p>
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Your document has been rejected and returned to draft:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 8px; color: #ef4444; font-size: 20px;">${context.documentNumber}${context.documentVersion}</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">${context.documentTitle}</p>
                    ${context.rejectedBy ? `<p style="margin: 12px 0 0; color: #9ca3af; font-size: 14px;">Rejected by: ${context.rejectedBy}</p>` : ''}
                  </td>
                </tr>
              </table>
              
              ${context.rejectionReason ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 600;">Rejection Reason:</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">${context.rejectionReason}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${editUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Edit Document →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">BaselineDocs - <a href="${siteUrl}/settings/notifications" style="color: #ef4444;">Manage preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateDocumentReleasedHTML(userName: string, context: EmailContext, viewUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">📄 Document Released</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Hi ${userName},</p>
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">Your document has been released and is now available:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 8px; color: #3b82f6; font-size: 20px;">${context.documentNumber}${context.documentVersion}</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">${context.documentTitle}</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${viewUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Document →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #6b7280;">BaselineDocs - <a href="${siteUrl}/settings/notifications" style="color: #3b82f6;">Manage preferences</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
