/**
 * Helper function to sync invoices from Stripe
 * app/admin/billing/sync-invoices.ts
 */

import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export async function syncInvoicesFromStripe(tenantId: string, stripeCustomerId: string) {
  if (!stripeCustomerId) {
    return []
  }

  try {
    // Fetch invoices from Stripe
    const stripeInvoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 12,
    })

    if (stripeInvoices.data.length === 0) {
      return []
    }

    const supabase = await createClient()

    // Backfill missing invoices into database
    for (const invoice of stripeInvoices.data) {
      const invoiceAny = invoice as any
      const subscriptionId = typeof invoiceAny.subscription === 'string' 
        ? invoiceAny.subscription 
        : invoiceAny.subscription?.id || null

      await supabase.from('invoices').upsert({
        tenant_id: tenantId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        amount_due: (invoice.amount_due || 0) / 100,
        amount_paid: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency,
        status: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' ? 'pending' : 'failed',
        invoice_date: new Date((invoice.created || 0) * 1000).toISOString(),
        paid_at: invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
          : null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf_url: invoice.invoice_pdf || null,
      }, { 
        onConflict: 'stripe_invoice_id',
        ignoreDuplicates: false 
      })
    }

    // Return fresh data from database
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('invoice_date', { ascending: false })
      .limit(12)

    return invoices || []
  } catch (error) {
    console.error('Error syncing invoices from Stripe:', error)
    return []
  }
}
