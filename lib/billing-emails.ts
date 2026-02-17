/**
 * Billing Email Utilities
 * lib/billing-emails.ts
 * 
 * Centralized email functions for billing notifications
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_BILLING_EMAIL = process.env.FROM_BILLING_EMAIL || 'billing@baselinedocs.com'
const OWNER_EMAIL = process.env.FEEDBACK_EMAIL || 'abbott.dan@gmail.com'

const PLAN_NAMES: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

/**
 * Send 5-day advance payment reminder email
 */
export async function sendPaymentReminderEmail(params: {
  toEmail: string
  companyName: string
  plan: string
  amount: number
  billingDate: string
  invoiceUrl?: string | null
}) {
  const planName = PLAN_NAMES[params.plan] || params.plan

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #1e40af; padding: 32px 40px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">BaselineDocs</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Document Control System</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #111827; margin: 0 0 8px; font-size: 20px;">📅 Upcoming payment reminder</h2>
          <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
            Hi <strong>${params.companyName}</strong>, this is a friendly reminder that your BaselineDocs subscription will renew soon.
          </p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Plan</p>
                  <p style="margin: 4px 0 0; font-size: 16px; color: #111827; font-weight: 600;">${planName}</p>
                </td>
                <td style="padding: 8px 0; text-align: right;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Amount</p>
                  <p style="margin: 4px 0 0; font-size: 18px; color: #0369a1; font-weight: 700;">$${params.amount.toFixed(2)}</p>
                </td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e0f2fe; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Billing date:</strong> ${params.billingDate}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
            Your payment method will be charged automatically on this date. No action is needed from you.
          </p>
          ${params.invoiceUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${params.invoiceUrl}" 
               style="display: inline-block; background: #1e40af; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              View Invoice
            </a>
          </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 13px; margin: 0;">
            Questions about your billing? Visit your 
            <a href="https://app.baselinedocs.com/admin/billing" style="color: #1e40af;">billing dashboard</a> 
            or reply to this email.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            BaselineDocs · Document Control System<br>
            This is a billing reminder for your account.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const result = await resend.emails.send({
    from: FROM_BILLING_EMAIL,
    to: params.toEmail,
    bcc: OWNER_EMAIL,
    subject: `Upcoming charge: $${params.amount.toFixed(2)} on ${params.billingDate}`,
    html,
  })

  return result
}

/**
 * Send payment confirmation email after successful payment
 */
export async function sendPaymentConfirmationEmail(params: {
  toEmail: string
  companyName: string
  plan: string
  amount: number
  invoiceNumber: string
  paidDate: string
  invoiceUrl?: string | null
  receiptUrl?: string | null
}) {
  const planName = PLAN_NAMES[params.plan] || params.plan

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #1e40af; padding: 32px 40px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">BaselineDocs</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Document Control System</p>
        </div>
        <div style="padding: 40px;">
          <div style="background: #dcfce7; border: 2px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <h2 style="color: #166534; margin: 0; font-size: 18px;">✓ Payment Received</h2>
          </div>
          <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
            Hi <strong>${params.companyName}</strong>, your payment has been processed successfully.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Plan</p>
                  <p style="margin: 4px 0 0; font-size: 16px; color: #111827; font-weight: 600;">${planName}</p>
                </td>
                <td style="padding: 8px 0; text-align: right;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Amount Paid</p>
                  <p style="margin: 4px 0 0; font-size: 18px; color: #059669; font-weight: 700;">$${params.amount.toFixed(2)}</p>
                </td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Invoice:</strong> ${params.invoiceNumber}<br>
              <strong>Paid on:</strong> ${params.paidDate}
            </p>
          </div>
          ${params.invoiceUrl || params.receiptUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            ${params.invoiceUrl ? `<a href="${params.invoiceUrl}" style="display: inline-block; background: #1e40af; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 0 8px;">View Invoice</a>` : ''}
            ${params.receiptUrl ? `<a href="${params.receiptUrl}" style="display: inline-block; background: #6b7280; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 0 8px;">Download Receipt</a>` : ''}
          </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 13px; margin: 0;">
            Questions about your billing? Visit your 
            <a href="https://app.baselinedocs.com/admin/billing" style="color: #1e40af;">billing dashboard</a> 
            or reply to this email.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            BaselineDocs · Document Control System<br>
            This is a payment confirmation for your subscription.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const result = await resend.emails.send({
    from: FROM_BILLING_EMAIL,
    to: params.toEmail,
    bcc: OWNER_EMAIL,
    subject: `Payment received: $${params.amount.toFixed(2)}`,
    html,
  })

  return result
}
