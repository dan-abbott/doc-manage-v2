/**
 * Email Digest Builder - Phase 2
 * 
 * Builds beautiful daily digest emails from queued notifications
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.baselinedocs.com'

interface DigestNotification {
  id: string
  notification_type: string
  document_number: string
  document_version: string
  document_title: string
  document_id: string
  created_at: string
  metadata: any
}

interface DigestGroup {
  approval_completed: DigestNotification[]
  document_rejected: DigestNotification[]
  document_released: DigestNotification[]
}

/**
 * Group notifications by type
 */
export function groupNotifications(notifications: DigestNotification[]): DigestGroup {
  const grouped: DigestGroup = {
    approval_completed: [],
    document_rejected: [],
    document_released: [],
  }

  for (const notif of notifications) {
    if (notif.notification_type in grouped) {
      grouped[notif.notification_type as keyof DigestGroup].push(notif)
    }
  }

  return grouped
}

/**
 * Generate digest email HTML
 */
export function generateDigestHTML(
  userName: string,
  notifications: DigestNotification[],
  digestDate: string
): string {
  const grouped = groupNotifications(notifications)
  const totalCount = notifications.length

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Document Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: white; font-size: 28px;">📬 Your Daily Document Summary</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">${digestDate}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 32px;">
                Hi ${userName},
              </p>
              
              <p style="font-size: 16px; color: #374151; margin: 0 0 32px;">
                Here's your document activity from the past 24 hours:
              </p>

              ${grouped.approval_completed.length > 0 ? `
              <!-- Approved Documents -->
              <div style="margin-bottom: 32px;">
                <h2 style="font-size: 18px; color: #10b981; margin: 0 0 16px; display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 8px;">✅</span>
                  DOCUMENTS APPROVED (${grouped.approval_completed.length})
                </h2>
                ${grouped.approval_completed.map(notif => `
                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 12px; border-radius: 6px;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #065f46;">
                      ${notif.document_number}${notif.document_version} - ${notif.document_title}
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; color: #047857;">
                      All reviewers approved
                    </p>
                    <a href="${siteUrl}/documents?selected=${notif.document_number}&version=${notif.document_version}" 
                       style="display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600;">
                      View Document →
                    </a>
                  </div>
                `).join('')}
              </div>
              ` : ''}

              ${grouped.document_rejected.length > 0 ? `
              <!-- Rejected Documents -->
              <div style="margin-bottom: 32px;">
                <h2 style="font-size: 18px; color: #ef4444; margin: 0 0 16px; display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 8px;">❌</span>
                  DOCUMENTS REJECTED (${grouped.document_rejected.length})
                </h2>
                ${grouped.document_rejected.map(notif => `
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 12px; border-radius: 6px;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #991b1b;">
                      ${notif.document_number}${notif.document_version} - ${notif.document_title}
                    </p>
                    <p style="margin: 0 0 4px; font-size: 14px; color: #dc2626;">
                      Returned to draft for revision
                    </p>
                    ${notif.metadata?.rejectionReason ? `
                    <p style="margin: 0 0 12px; font-size: 13px; color: #7f1d1d; background-color: #fee2e2; padding: 8px; border-radius: 4px;">
                      <strong>Reason:</strong> ${notif.metadata.rejectionReason}
                    </p>
                    ` : ''}
                    <a href="${siteUrl}/documents/${notif.document_id}/edit" 
                       style="display: inline-block; background-color: #ef4444; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600;">
                      Edit Document →
                    </a>
                  </div>
                `).join('')}
              </div>
              ` : ''}

              ${grouped.document_released.length > 0 ? `
              <!-- Released Documents -->
              <div style="margin-bottom: 32px;">
                <h2 style="font-size: 18px; color: #3b82f6; margin: 0 0 16px; display: flex; align-items: center;">
                  <span style="font-size: 20px; margin-right: 8px;">📄</span>
                  DOCUMENTS RELEASED (${grouped.document_released.length})
                </h2>
                ${grouped.document_released.map(notif => `
                  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 12px; border-radius: 6px;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #1e40af;">
                      ${notif.document_number}${notif.document_version} - ${notif.document_title}
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; color: #2563eb;">
                      Your document is now available
                    </p>
                    <a href="${siteUrl}/documents?selected=${notif.document_number}&version=${notif.document_version}" 
                       style="display: inline-block; background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600;">
                      View Document →
                    </a>
                  </div>
                `).join('')}
              </div>
              ` : ''}

              <div style="border-top: 2px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;">
                  📧 <strong>Daily Digest</strong> - You're receiving this summary because you selected Daily Digest mode.
                </p>
                <p style="font-size: 13px; color: #9ca3af; margin: 8px 0 0 0;">
                  Total notifications: ${totalCount}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                BaselineDocs - <a href="${siteUrl}/settings/notifications" style="color: #3b82f6; text-decoration: none;">Manage your preferences</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Switch to immediate mode to receive notifications in real-time.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Generate digest subject line
 */
export function generateDigestSubject(count: number, date: string): string {
  return `📬 Your Daily Document Summary - ${count} notification${count !== 1 ? 's' : ''} (${date})`
}
