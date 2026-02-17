'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { 
  stripe, 
  STRIPE_PRICES, 
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession 
} from '@/lib/stripe/client'

/**
 * Upgrade tenant plan (tenant admin action)
 */
export async function upgradeTenantPlan(data: {
  tenantId: string
  newPlan: string
  forceCheckout?: boolean
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  logger.info('🔵 [Billing] upgradeTenantPlan called', {
    tenantId: data.tenantId,
    newPlan: data.newPlan
  })
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.error('🔴 [Billing] User authentication failed', { error: userError })
      return { success: false, error: 'You must be logged in' }
    }

    logger.info('🟢 [Billing] User authenticated', { userId: user.id, email: user.email })

    // Validate plan
    const validPlans = ['starter', 'professional', 'enterprise'] as const
    if (!validPlans.includes(data.newPlan as any)) {
      logger.error('🔴 [Billing] Invalid plan', { plan: data.newPlan })
      return { success: false, error: 'Invalid plan selected' }
    }

    // Get subdomain to verify tenant context
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value

    if (!subdomain) {
      logger.error('🔴 [Billing] No subdomain cookie found')
      return { success: false, error: 'Tenant context not found' }
    }

    logger.info('🟢 [Billing] Subdomain found', { subdomain })

    // Verify tenant exists and matches subdomain
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, subdomain, company_name')
      .eq('subdomain', subdomain)
      .single()

    if (!tenantData || tenantData.id !== data.tenantId) {
      logger.error('🔴 [Billing] Tenant mismatch', { 
        tenantData: tenantData?.id, 
        requestedTenant: data.tenantId 
      })
      return { success: false, error: 'Tenant mismatch' }
    }

    logger.info('🟢 [Billing] Tenant verified', { 
      tenantId: tenantData.id, 
      companyName: tenantData.company_name 
    })

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, tenant_id, email')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin || userData.tenant_id !== data.tenantId) {
      logger.error('🔴 [Billing] Permission denied', { 
        isAdmin: userData?.is_admin, 
        userTenant: userData?.tenant_id,
        requestedTenant: data.tenantId
      })
      return { success: false, error: 'Only tenant administrators can upgrade plans' }
    }

    logger.info('🟢 [Billing] Admin permissions verified')

    // Get current billing info
    const { data: currentBilling } = await supabase
      .from('tenant_billing')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .single()

    logger.info('🟢 [Billing] Current billing retrieved', {
      currentPlan: currentBilling?.plan,
      stripeCustomerId: currentBilling?.stripe_customer_id,
      stripeSubscriptionId: currentBilling?.stripe_subscription_id
    })

    // Validate upgrade (can only go up, not down)
    const planOrder = ['trial', 'starter', 'professional', 'enterprise']
    const currentIndex = planOrder.indexOf(currentBilling?.plan || 'trial')
    const newIndex = planOrder.indexOf(data.newPlan)

    if (newIndex <= currentIndex) {
      logger.error('🔴 [Billing] Cannot downgrade', { 
        currentPlan: currentBilling?.plan, 
        newPlan: data.newPlan 
      })
      return { 
        success: false, 
        error: 'You can only upgrade to a higher plan. Contact support for downgrades.' 
      }
    }

    logger.info('🟢 [Billing] Upgrade validation passed', {
      from: currentBilling?.plan,
      to: data.newPlan
    })

    // Get or create Stripe customer
    logger.info('🔵 [Billing] Getting/creating Stripe customer...')
    
    const customerId = await getOrCreateStripeCustomer({
      tenantId: data.tenantId,
      email: userData.email || '',
      companyName: tenantData.company_name || tenantData.subdomain,
      existingCustomerId: currentBilling?.stripe_customer_id,
    })

    logger.info('🟢 [Billing] Stripe customer ready', { customerId })

    // Get price ID for the new plan
    const priceId = STRIPE_PRICES[data.newPlan as keyof typeof STRIPE_PRICES]

    if (!priceId) {
      logger.error('🔴 [Billing] Price ID not configured', { plan: data.newPlan })
      return { success: false, error: 'Invalid plan configuration' }
    }

    logger.info('🟢 [Billing] Price ID found', { plan: data.newPlan, priceId })

    // Check if they have an existing active subscription
    if (currentBilling?.stripe_subscription_id && !data.forceCheckout) {
      logger.info('🔵 [Billing] Existing subscription found - checking status...', {
        subscriptionId: currentBilling.stripe_subscription_id
      })
      
      // Retrieve and check subscription status before updating
      const subscription = await stripe.subscriptions.retrieve(
        currentBilling.stripe_subscription_id
      )

      if (subscription.status === 'canceled') {
        logger.info('🟡 [Billing] Subscription is cancelled - will create new checkout session', {
          subscriptionId: currentBilling.stripe_subscription_id,
          status: subscription.status
        })
        // Clear the cancelled subscription ID from database so we create a fresh one
        await supabase
          .from('tenant_billing')
          .update({ stripe_subscription_id: null })
          .eq('tenant_id', data.tenantId)
        // Fall through to checkout session creation below
      } else {
      logger.info('🔵 [Billing] Updating active subscription...', {
        subscriptionId: currentBilling.stripe_subscription_id,
        status: subscription.status
      })

      await stripe.subscriptions.update(currentBilling.stripe_subscription_id, {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          tenant_id: data.tenantId,
          plan: data.newPlan,
        },
      })

      logger.info('🟢 [Billing] Subscription updated in Stripe', {
        subscriptionId: currentBilling.stripe_subscription_id,
        newPlan: data.newPlan
      })

      // Update billing record
      await supabase
        .from('tenant_billing')
        .update({
          plan: data.newPlan,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', data.tenantId)

      logger.info('🟢 [Billing] Database updated')

      // Log to billing history
      await supabase
        .from('billing_history')
        .insert({
          tenant_id: data.tenantId,
          action: 'plan_upgrade',
          previous_plan: currentBilling?.plan || 'trial',
          new_plan: data.newPlan,
          reason: 'Tenant admin upgrade via billing page',
          performed_by: user.id,
          performed_by_email: user.email || '',
        })

      logger.info('🟢 [Billing] Billing history logged')

      revalidatePath('/admin/billing')

      return {
        success: true,
        message: 'Plan upgraded successfully!'
      }
      } // end else (active subscription)
    }

    // No existing subscription (or cancelled) - check for saved payment method first
    logger.info('🔵 [Billing] No active subscription - checking for saved payment method...')

    // Check if the Stripe customer has a default payment method saved
    const stripeCustomer = await stripe.customers.retrieve(customerId) as any
    const defaultPaymentMethod = stripeCustomer.invoice_settings?.default_payment_method

    if (defaultPaymentMethod && !data.forceCheckout) {
      // Customer has a saved card - create subscription directly, no Checkout needed
      logger.info('🔵 [Billing] Saved payment method found - creating subscription directly', {
        customerId,
        paymentMethod: typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id
      })

      const paymentMethodId = typeof defaultPaymentMethod === 'string' 
        ? defaultPaymentMethod 
        : defaultPaymentMethod.id

      const newSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        metadata: {
          tenant_id: data.tenantId,
          plan: data.newPlan,
        },
      })

      logger.info('🟢 [Billing] Subscription created directly', {
        subscriptionId: newSubscription.id,
        status: newSubscription.status
      })

      // Update billing record immediately
      const { data: existingBilling } = await supabase
        .from('tenant_billing')
        .select('id')
        .eq('tenant_id', data.tenantId)
        .single()

      const billingData = {
        tenant_id: data.tenantId,
        stripe_customer_id: customerId,
        stripe_subscription_id: newSubscription.id,
        plan: data.newPlan,
        status: newSubscription.status,
        updated_at: new Date().toISOString(),
      }

      if (existingBilling) {
        await supabase.from('tenant_billing').update(billingData).eq('tenant_id', data.tenantId)
      } else {
        await supabase.from('tenant_billing').insert(billingData)
      }

      logger.info('🟢 [Billing] Database updated after direct subscription creation')

      revalidatePath('/admin/billing')

      return {
        success: true,
        message: 'Plan upgraded successfully!'
      }
    }

    // No saved payment method (or forceCheckout) - redirect to Stripe Checkout
    logger.info('🔵 [Billing] No saved payment method - creating checkout session...')
    
    const session = await createCheckoutSession({
      customerId,
      priceId,
      tenantId: data.tenantId,
      successUrl: `https://${subdomain}.baselinedocs.com/admin/billing?success=true`,
      cancelUrl: `https://${subdomain}.baselinedocs.com/admin/billing?canceled=true`,
    })

    logger.info('🟢 [Billing] Checkout session created', {
      sessionId: session.id,
      url: session.url,
      successUrl: `https://${subdomain}.baselinedocs.com/admin/billing?success=true`
    })

    // Update customer ID in database
    await supabase
      .from('tenant_billing')
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', data.tenantId)

    logger.info('🟢 [Billing] Customer ID saved to database')

    // Return checkout URL for redirect
    return {
      success: true,
      checkoutUrl: session.url,
    }
  } catch (error: any) {
    logger.error('🔴 [Billing] FATAL ERROR', { 
      error: error.message,
      stack: error.stack,
      tenantId: data.tenantId 
    })
    return {
      success: false,
      error: error.message || 'Failed to upgrade plan'
    }
  }
}
