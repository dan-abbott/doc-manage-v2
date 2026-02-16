/**
 * Stripe Integration Library
 * lib/stripe/client.ts
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Plan to Price ID mapping
export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const

export type PlanId = keyof typeof STRIPE_PRICES

/**
 * Create or retrieve Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(params: {
  tenantId: string
  email: string
  companyName: string
  existingCustomerId?: string | null
}): Promise<string> {
  // Return existing customer if we have one
  if (params.existingCustomerId) {
    try {
      await stripe.customers.retrieve(params.existingCustomerId)
      return params.existingCustomerId
    } catch (error) {
      console.log('Existing customer not found, creating new one')
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.companyName,
    metadata: {
      tenant_id: params.tenantId,
    },
  })

  return customer.id
}

/**
 * Create a subscription for a tenant
 */
export async function createSubscription(params: {
  customerId: string
  priceId: string
  tenantId: string
  plan: string
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      tenant_id: params.tenantId,
      plan: params.plan,
    },
  })

  return subscription
}

/**
 * Update subscription to new plan
 */
export async function updateSubscription(params: {
  subscriptionId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)
  
  const updatedSubscription = await stripe.subscriptions.update(
    params.subscriptionId,
    {
      items: [{
        id: subscription.items.data[0].id,
        price: params.newPriceId,
      }],
      proration_behavior: params.prorationBehavior || 'create_prorations',
    }
  )

  return updatedSubscription
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return await stripe.subscriptions.cancel(subscriptionId)
  }
}

/**
 * Create a checkout session for plan upgrade
 */
export async function createCheckoutSession(params: {
  customerId: string
  priceId: string
  tenantId: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [{
      price: params.priceId,
      quantity: 1,
    }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      tenant_id: params.tenantId,
    },
  })

  return session
}

/**
 * Create Billing Portal session
 */
export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session
}

/**
 * Get payment method details
 */
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return await stripe.paymentMethods.retrieve(paymentMethodId)
}
