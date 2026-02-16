/**
 * Stripe Webhook Handler - FIXED for Stripe v20
 * File: app/api/webhooks/stripe/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Webhook] Invalid signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`🔵 [Webhook] Received event: ${event.type}`, {
    eventId: event.id,
    created: new Date(event.created * 1000).toISOString()
  })
  
  await logEvent(event)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('🟢 [Webhook] Processing subscription.created')
        await handleSubscription(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        console.log('🟢 [Webhook] Processing subscription.updated')
        await handleSubscription(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        console.log('🟢 [Webhook] Processing subscription.deleted')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
        console.log('🟢 [Webhook] Processing invoice.paid')
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        console.log('🟢 [Webhook] Processing invoice.payment_failed')
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'payment_method.attached':
        console.log('🟢 [Webhook] Processing payment_method.attached')
        await handlePaymentMethod(event.data.object as Stripe.PaymentMethod)
        break
      default:
        console.log('⚠️ [Webhook] Unhandled event type:', event.type)
    }

    await markProcessed(event.id)
    console.log('✅ [Webhook] Event processed successfully:', event.type)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('🔴 [Webhook] Processing error:', {
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      stack: error.stack
    })
    await logError(event.id, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function logEvent(event: Stripe.Event) {
  await supabase.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    data: event.data.object,
    processed: false,
  })
}

async function markProcessed(eventId: string) {
  await supabase.from('stripe_events').update({ processed: true }).eq('stripe_event_id', eventId)
}

async function logError(eventId: string, error: string) {
  await supabase.from('stripe_events').update({ error }).eq('stripe_event_id', eventId)
}

async function getTenantId(customerId: string) {
  const { data } = await supabase.from('tenants').select('id').eq('stripe_customer_id', customerId).single()
  if (!data) throw new Error(`No tenant for customer ${customerId}`)
  return data.id
}

async function handleSubscription(sub: Stripe.Subscription) {
  console.log('🔵 [Webhook] handleSubscription called', {
    subscriptionId: sub.id,
    customerId: sub.customer,
    status: sub.status
  })
  
  const tenantId = await getTenantId(sub.customer as string)
  console.log('🟢 [Webhook] Tenant ID resolved:', tenantId)
  
  let pm = null
  if (sub.default_payment_method) {
    pm = await stripe.paymentMethods.retrieve(sub.default_payment_method as string)
    console.log('🟢 [Webhook] Payment method retrieved:', {
      type: pm.type,
      brand: pm.card?.brand,
      last4: pm.card?.last4
    })
  }

  const priceId = sub.items.data[0]?.price?.id
  let plan = 'trial'
  if (priceId === process.env.STRIPE_PRICE_STARTER) plan = 'starter'
  else if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) plan = 'professional'
  else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) plan = 'enterprise'

  console.log('🟢 [Webhook] Plan determined:', { priceId, plan })

  // Stripe v20 changed: use billing_cycle_anchor as fallback for current_period_start
  const subAny = sub as any
  const currentPeriodStart = subAny.billing_cycle_anchor || Math.floor(Date.now() / 1000)
  // Estimate end (30 days for monthly, will be corrected by invoice events)
  const currentPeriodEnd = subAny.cancel_at || (currentPeriodStart + 2592000)

  const billingUpdate = {
    tenant_id: tenantId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    plan,
    status: sub.status,
    billing_cycle: sub.items.data[0]?.price?.recurring?.interval || 'month',
    current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
    current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
    trial_ends_at: subAny.trial_end ? new Date(subAny.trial_end * 1000).toISOString() : null,
    cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    payment_method_type: pm?.type || null,
    payment_method_last4: pm?.card?.last4 || null,
    payment_method_brand: pm?.card?.brand || null,
  }

  console.log('🔵 [Webhook] Upserting tenant_billing:', billingUpdate)

  const { error } = await supabase.from('tenant_billing').upsert(billingUpdate, { onConflict: 'tenant_id' })
  
  if (error) {
    console.error('🔴 [Webhook] Failed to update tenant_billing:', error)
    throw error
  }

  console.log('✅ [Webhook] Subscription processed successfully:', {
    tenantId,
    plan,
    status: sub.status
  })

  console.log(`[Webhook] Subscription synced: ${tenantId}`)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const tenantId = await getTenantId(sub.customer as string)
  await supabase.from('tenant_billing').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('tenant_id', tenantId)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.customer) return
  const tenantId = await getTenantId(invoice.customer as string)

  // Stripe v20: subscription might be string or object
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
    status: 'paid',
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    paid_at: new Date().toISOString(),
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf_url: invoice.invoice_pdf || null,
  }, { onConflict: 'stripe_invoice_id' })

  await supabase.from('tenant_billing')
    .update({ status: 'active' })
    .eq('tenant_id', tenantId)
    .eq('status', 'past_due')

  console.log(`[Webhook] Invoice paid: ${tenantId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.customer) return
  const tenantId = await getTenantId(invoice.customer as string)
  await supabase.from('tenant_billing').update({ status: 'past_due' }).eq('tenant_id', tenantId)
  console.log(`[Webhook] Payment failed: ${tenantId}`)
}

async function handlePaymentMethod(pm: Stripe.PaymentMethod) {
  if (!pm.customer) return
  const tenantId = await getTenantId(pm.customer as string)
  await supabase.from('tenant_billing').update({
    payment_method_type: pm.type,
    payment_method_last4: pm.card?.last4 || null,
    payment_method_brand: pm.card?.brand || null,
  }).eq('tenant_id', tenantId)
}
