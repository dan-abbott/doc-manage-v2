/**
 * Test endpoint to simulate billing cycle
 * app/api/admin/test-billing-cycle/route.ts
 * 
 * ADMIN ONLY - Use to test:
 * - Invoice creation
 * - Payment processing
 * - Email notifications
 * - Database updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_master_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_master_admin) {
      return NextResponse.json({ error: 'Master admin access required' }, { status: 403 })
    }

    // Get tenant from query params or body
    const body = await request.json()
    const tenantSubdomain = body.subdomain

    if (!tenantSubdomain) {
      return NextResponse.json({ error: 'Subdomain required' }, { status: 400 })
    }

    // Get tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, subdomain, company_name')
      .eq('subdomain', tenantSubdomain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get billing info
    const { data: billing } = await supabase
      .from('tenant_billing')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()

    if (!billing?.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No active subscription found' 
      }, { status: 400 })
    }

    console.log('[Test Billing] Starting test cycle for:', tenant.subdomain)

    // Step 1: Get upcoming invoice
    const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
      customer: billing.stripe_customer_id,
      subscription: billing.stripe_subscription_id,
    })

    console.log('[Test Billing] Upcoming invoice:', upcomingInvoice.id)

    // Step 2: Create "pending" invoice in database (simulating 5-day reminder)
    await supabase.from('invoices').upsert({
      tenant_id: tenant.id,
      stripe_invoice_id: upcomingInvoice.id,
      stripe_subscription_id: billing.stripe_subscription_id,
      amount_due: (upcomingInvoice.amount_due || 0) / 100,
      amount_paid: 0,
      currency: upcomingInvoice.currency,
      status: 'pending',
      invoice_date: new Date(upcomingInvoice.created * 1000).toISOString(),
      paid_at: null,
      hosted_invoice_url: upcomingInvoice.hosted_invoice_url || null,
      invoice_pdf_url: upcomingInvoice.invoice_pdf || null,
    }, {
      onConflict: 'stripe_invoice_id',
      ignoreDuplicates: false
    })

    console.log('[Test Billing] Pending invoice created')

    // Step 3: Send reminder email (simulating 5-day advance notice)
    const { data: adminUser } = await supabase
      .from('users')
      .select('email')
      .eq('tenant_id', tenant.id)
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (adminUser?.email) {
      const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id) as any
      const billingDate = new Date(subscription.current_period_end * 1000)
      
      // Import the email function
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      const html = buildReminderEmail({
        companyName: tenant.company_name || tenant.subdomain,
        plan: billing.plan,
        amount: (upcomingInvoice.amount_due || 0) / 100,
        billingDate: billingDate.toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        }),
        invoiceUrl: upcomingInvoice.hosted_invoice_url,
      })

      await resend.emails.send({
        from: process.env.FROM_BILLING_EMAIL || 'billing@baselinedocs.com',
        to: adminUser.email,
        bcc: process.env.FEEDBACK_EMAIL || 'abbott.dan@gmail.com',
        subject: `[TEST] Upcoming charge: $${((upcomingInvoice.amount_due || 0) / 100).toFixed(2)}`,
        html,
      })

      console.log('[Test Billing] Reminder email sent to:', adminUser.email)
    }

    // Step 4: Finalize the invoice (this triggers actual payment)
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(upcomingInvoice.id, {
      auto_advance: true, // Automatically attempt payment
    })

    console.log('[Test Billing] Invoice finalized:', finalizedInvoice.id)

    // Wait a moment for payment to process
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 5: Retrieve the paid invoice
    const paidInvoice = await stripe.invoices.retrieve(finalizedInvoice.id)

    console.log('[Test Billing] Invoice status:', paidInvoice.status)

    // The webhook should handle updating the invoice to "paid" status
    // and sending the payment confirmation email

    return NextResponse.json({
      success: true,
      message: 'Test billing cycle completed',
      tenant: tenant.subdomain,
      steps: {
        upcomingInvoiceCreated: upcomingInvoice.id,
        pendingInvoiceInDatabase: true,
        reminderEmailSent: !!adminUser?.email,
        invoiceFinalized: finalizedInvoice.id,
        invoiceStatus: paidInvoice.status,
        webhookNote: 'Webhook should update invoice to paid and send confirmation email'
      },
      nextSteps: [
        '1. Check your email for the reminder (with [TEST] prefix)',
        '2. Check Stripe dashboard for the finalized invoice',
        '3. Wait a moment for webhook to fire',
        '4. Check email for payment confirmation',
        '5. Refresh billing page to see updated invoice'
      ]
    })

  } catch (error: any) {
    console.error('[Test Billing] Error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}

function buildReminderEmail(params: {
  companyName: string
  plan: string
  amount: number
  billingDate: string
  invoiceUrl: string | null
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #dc2626; padding: 24px 40px;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">⚠️ TEST MODE</h1>
          <p style="color: #fecaca; margin: 8px 0 0; font-size: 13px;">This is a test email - charges are real!</p>
        </div>
        <div style="background: #1e40af; padding: 32px 40px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">BaselineDocs</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Document Control System</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #111827; margin: 0 0 8px; font-size: 20px;">📅 Upcoming payment reminder</h2>
          <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
            Hi <strong>${params.companyName}</strong>, this is a test of the billing reminder system.
          </p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Plan</p>
                  <p style="margin: 4px 0 0; font-size: 16px; color: #111827; font-weight: 600;">${params.plan}</p>
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
          ${params.invoiceUrl ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${params.invoiceUrl}" 
               style="display: inline-block; background: #1e40af; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              View Invoice
            </a>
          </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}
