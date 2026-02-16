/**
 * Stripe Webhook Handler
 * app/api/webhooks/stripe/route.ts
 * 
 * Handles Stripe events:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Use service role for webhook operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[Stripe Webhook] Received event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Handle successful checkout - subscription created
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenant_id

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenant_id in session metadata')
    return
  }

  console.log('[Stripe Webhook] Checkout completed for tenant:', tenantId)

  const subscription: any = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ['default_payment_method'] }
  )
  
  const priceId = subscription.items.data[0].price.id

  // Determine plan from price ID
  const plan = getPlanFromPriceId(priceId)

  if (!plan) {
    console.error('[Stripe Webhook] Unknown price ID:', priceId)
    return
  }

  // Update tenant_billing
  const { error: updateError } = await supabase
    .from('tenant_billing')
    .update({
      plan: plan,
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      stripe_price_id: priceId,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[Stripe Webhook] Failed to update billing:', updateError)
    throw updateError
  }

  // Get payment method details
  let paymentMethodDetails = null
  if (subscription.default_payment_method) {
    const pmId = typeof subscription.default_payment_method === 'string' 
      ? subscription.default_payment_method 
      : subscription.default_payment_method.id
      
    const paymentMethod = await stripe.paymentMethods.retrieve(pmId)
    paymentMethodDetails = {
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
      exp_month: paymentMethod.card?.exp_month,
      exp_year: paymentMethod.card?.exp_year,
    }
  }

  // Update payment method info
  if (paymentMethodDetails) {
    await supabase
      .from('tenant_billing')
      .update({
        payment_method_brand: paymentMethodDetails.brand,
        payment_method_last4: paymentMethodDetails.last4,
        payment_method_exp_month: paymentMethodDetails.exp_month,
        payment_method_exp_year: paymentMethodDetails.exp_year,
      })
      .eq('tenant_id', tenantId)
  }

  // Log to billing history
  await supabase
    .from('billing_history')
    .insert({
      tenant_id: tenantId,
      action: 'subscription_created',
      new_plan: plan,
      reason: 'Stripe subscription created',
      performed_by: tenantId, // System action
      performed_by_email: 'system@stripe',
    })

  console.log('[Stripe Webhook] ✅ Subscription activated:', {
    tenantId,
    plan,
    subscriptionId: session.subscription,
  })
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenant_id in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0].price.id
  const plan = getPlanFromPriceId(priceId)

  if (!plan) {
    console.error('[Stripe Webhook] Unknown price ID:', priceId)
    return
  }

  // Map Stripe status to our status
  let status = 'active'
  if (subscription.status === 'past_due') status = 'past_due'
  if (subscription.status === 'canceled') status = 'cancelled'
  if (subscription.status === 'unpaid') status = 'past_due'

  const { error: updateError } = await supabase
    .from('tenant_billing')
    .update({
      plan: plan,
      status: status,
      stripe_price_id: priceId,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[Stripe Webhook] Failed to update subscription:', updateError)
    throw updateError
  }

  console.log('[Stripe Webhook] ✅ Subscription updated:', {
    tenantId,
    plan,
    status: subscription.status,
  })
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenant_id in subscription metadata')
    return
  }

  const { error: updateError } = await supabase
    .from('tenant_billing')
    .update({
      plan: 'trial',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[Stripe Webhook] Failed to cancel subscription:', updateError)
    throw updateError
  }

  // Log to billing history
  await supabase
    .from('billing_history')
    .insert({
      tenant_id: tenantId,
      action: 'subscription_cancelled',
      previous_plan: subscription.metadata?.plan || 'unknown',
      new_plan: 'trial',
      reason: 'Stripe subscription cancelled',
      performed_by: tenantId,
      performed_by_email: 'system@stripe',
    })

  console.log('[Stripe Webhook] ✅ Subscription cancelled:', { tenantId })
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.log('[Stripe Webhook] Invoice not for subscription, skipping')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const tenantId = subscription.metadata?.tenant_id

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenant_id in subscription metadata')
    return
  }

  // Update last payment date
  await supabase
    .from('tenant_billing')
    .update({
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  // Store invoice in database
  await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      amount_due: invoice.amount_due / 100,
      amount_paid: invoice.amount_paid / 100,
      status: invoice.status || 'paid',
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf_url: invoice.invoice_pdf,
      paid_at: invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
        : null,
    })
    .onConflict('stripe_invoice_id')

  console.log('[Stripe Webhook] ✅ Payment succeeded:', {
    tenantId,
    amount: invoice.amount_paid / 100,
  })
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const tenantId = subscription.metadata?.tenant_id

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenant_id in subscription metadata')
    return
  }

  // Update status to past_due
  await supabase
    .from('tenant_billing')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  // TODO: Send email notification to tenant admin

  console.log('[Stripe Webhook] ⚠️ Payment failed:', { tenantId })
}

/**
 * Helper: Get plan name from Stripe price ID
 */
function getPlanFromPriceId(priceId: string): string | null {
  const prices = {
    [process.env.STRIPE_PRICE_STARTER!]: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL!]: 'professional',
    [process.env.STRIPE_PRICE_ENTERPRISE!]: 'enterprise',
  }

  return prices[priceId] || null
}
