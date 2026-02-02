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
 * 2. Approval Complete Email
 * Sent when all approvals are completed
 */
export async function sendApprovalCompleteEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'approval_completed')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping approval complete for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const viewUrl = `${siteUrl}/documents?selected=${context.documentNumber}&version=${context.documentVersion}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `✅ Document Approved: ${context.documentNumber}${context.documentVersion}`,
      html: generateApprovalCompleteHTML(check.userName, context, viewUrl),
    })

    console.log(`[Email] ✓ Sent approval complete to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send approval complete:', error)
    return { success: false, reason: 'error', error }
  }
}

/**
 * 3. Document Rejected Email
 * Sent when document is rejected by an approver
 */
export async function sendDocumentRejectedEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'document_rejected')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping rejection for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const editUrl = `${siteUrl}/documents/${context.documentId}/edit`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `❌ Document Rejected: ${context.documentNumber}${context.documentVersion}`,
      html: generateDocumentRejectedHTML(check.userName, context, editUrl),
    })

    console.log(`[Email] ✓ Sent rejection email to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send rejection email:', error)
    return { success: false, reason: 'error', error }
  }
}

/**
 * 4. Document Released Email
 * Sent when document is released
 */
export async function sendDocumentReleasedEmail(
  creatorId: string,
  context: EmailContext
) {
  const check = await shouldNotify(creatorId, 'document_released')
  
  if (!check.send || !check.email) {
    console.log(`[Email] Skipping release notification for ${creatorId} (disabled)`)
    return { success: false, reason: 'disabled' }
  }

  const viewUrl = `${siteUrl}/documents?selected=${context.documentNumber}&version=${context.documentVersion}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: check.email,
      subject: `🎉 Document Released: ${context.documentNumber}${context.documentVersion}`,
      html: generateDocumentReleasedHTML(check.userName, context, viewUrl),
    })

    console.log(`[Email] ✓ Sent release notification to ${check.email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] ✗ Failed to send release notification:', error)
    return { success: false, reason: 'error', error }
  }
}

// ============================================================================
// HTML EMAIL TEMPLATES
// ============================================================================

function generateApprovalRequestHTML(userName: string, context: EmailContext, viewUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏳ Approval Needed</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0; font-size: 16px;">Hi ${userName},</p>
    
    <p>You've been assigned to review and approve the following document:</p>
    
    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${context.documentNumber}${context.documentVersion}</p>
      <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${context.documentTitle}</p>
      ${context.submittedBy ? `<p style="margin: 0;"><strong>Submitted by:</strong> ${context.submittedBy}</p>` : ''}
    </div>
    
    <p>Please review the document and provide your approval decision.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Document</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-bottom: 0;">This is an automated notification from your Document Control System.</p>
  </div>
</body>
</html>
  `
}

function generateApprovalCompleteHTML(userName: string, context: EmailContext, viewUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Document Approved</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0; font-size: 16px;">Hi ${userName},</p>
    
    <p>Great news! Your document has been approved by all reviewers and is now released.</p>
    
    <div style="background: white; border-left: 4px solid #38ef7d; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${context.documentNumber}${context.documentVersion}</p>
      <p style="margin: 0;"><strong>Title:</strong> ${context.documentTitle}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" style="background: #38ef7d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Document</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-bottom: 0;">This is an automated notification from your Document Control System.</p>
  </div>
</body>
</html>
  `
}

function generateDocumentRejectedHTML(userName: string, context: EmailContext, editUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">❌ Document Rejected</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0; font-size: 16px;">Hi ${userName},</p>
    
    <p>Your document has been rejected and returned to draft status for revision.</p>
    
    <div style="background: white; border-left: 4px solid #f5576c; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${context.documentNumber}${context.documentVersion}</p>
      <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${context.documentTitle}</p>
      ${context.rejectedBy ? `<p style="margin: 0 0 10px 0;"><strong>Rejected by:</strong> ${context.rejectedBy}</p>` : ''}
      ${context.rejectionReason ? `
        <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 5px;">
          <p style="margin: 0; color: #856404;"><strong>Reason:</strong></p>
          <p style="margin: 5px 0 0 0; color: #856404;">${context.rejectionReason}</p>
        </div>
      ` : ''}
    </div>
    
    <p>You can now edit the document and resubmit it for approval.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${editUrl}" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Edit Document</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-bottom: 0;">This is an automated notification from your Document Control System.</p>
  </div>
</body>
</html>
  `
}

function generateDocumentReleasedHTML(userName: string, context: EmailContext, viewUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Document Released</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0; font-size: 16px;">Hi ${userName},</p>
    
    <p>Your document has been released and is now available to all users.</p>
    
    <div style="background: white; border-left: 4px solid #00f2fe; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${context.documentNumber}${context.documentVersion}</p>
      <p style="margin: 0;"><strong>Title:</strong> ${context.documentTitle}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" style="background: #00f2fe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Document</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-bottom: 0;">This is an automated notification from your Document Control System.</p>
  </div>
</body>
</html>
  `
}
