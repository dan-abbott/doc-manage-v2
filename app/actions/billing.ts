/**
 * Billing Actions with Stripe Integration
 * app/actions/billing.ts
 */

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
 * Upgrade tenant plan with Stripe Checkout
 */
export async function upgradeTenantPlan(data: {
  tenantId: string
  newPlan: string
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate plan
    const validPlans = ['starter', 'professional', 'enterprise'] as const
    if (!validPlans.includes(data.newPlan as any)) {
      return { success: false, error: 'Invalid plan selected' }
    }

    // Get subdomain to verify tenant context
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value

    if (!subdomain) {
      return { success: false, error: 'Tenant context not found' }
    }

    // Verify tenant exists and matches subdomain
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, subdomain, company_name')
      .eq('subdomain', subdomain)
      .single()

    if (!tenantData || tenantData.id !== data.tenantId) {
      return { success: false, error: 'Tenant mismatch' }
    }

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, tenant_id, email')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin || userData.tenant_id !== data.tenantId) {
      return { success: false, error: 'Only tenant administrators can upgrade plans' }
    }

    // Get current billing info
    const { data: currentBilling } = await supabase
      .from('tenant_billing')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .single()

    // Validate upgrade (can only go up, not down)
    const planOrder = ['trial', 'starter', 'professional', 'enterprise']
    const currentIndex = planOrder.indexOf(currentBilling?.plan || 'trial')
    const newIndex = planOrder.indexOf(data.newPlan)

    if (newIndex <= currentIndex) {
      return { 
        success: false, 
        error: 'You can only upgrade to a higher plan. Contact support for downgrades.' 
      }
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      tenantId: data.tenantId,
      email: userData.email || '',
      companyName: tenantData.company_name || tenantData.subdomain,
      existingCustomerId: currentBilling?.stripe_customer_id,
    })

    // Get price ID for the new plan
    const priceId = STRIPE_PRICES[data.newPlan as keyof typeof STRIPE_PRICES]

    if (!priceId) {
      return { success: false, error: 'Invalid plan configuration' }
    }

    // Check if they have an existing subscription
    if (currentBilling?.stripe_subscription_id) {
      // Update existing subscription
      const subscription = await stripe.subscriptions.retrieve(
        currentBilling.stripe_subscription_id
      )

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

      // Update billing record
      await supabase
        .from('tenant_billing')
        .update({
          plan: data.newPlan,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', data.tenantId)

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

      logger.info('Subscription upgraded', {
        tenantId: data.tenantId,
        previousPlan: currentBilling?.plan,
        newPlan: data.newPlan,
      })

      revalidatePath('/admin/billing')

      return {
        success: true,
        message: 'Plan upgraded successfully!'
      }
    }

    // No existing subscription - create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.baselinedocs.com'
    const session = await createCheckoutSession({
      customerId,
      priceId,
      tenantId: data.tenantId,
      successUrl: `https://${subdomain}.baselinedocs.com/admin/billing?success=true`,
      cancelUrl: `https://${subdomain}.baselinedocs.com/admin/billing?canceled=true`,
    })

    // Update customer ID in database
    await supabase
      .from('tenant_billing')
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', data.tenantId)

    logger.info('Checkout session created', {
      tenantId: data.tenantId,
      plan: data.newPlan,
      sessionId: session.id,
    })

    // Return checkout URL for redirect
    return {
      success: true,
      checkoutUrl: session.url,
    }
  } catch (error: any) {
    logger.error('Failed to upgrade plan', { 
      error: error.message, 
      tenantId: data.tenantId 
    })
    return {
      success: false,
      error: error.message || 'Failed to upgrade plan'
    }
  }
}

/**
 * Open Stripe Billing Portal
 */
export async function openBillingPortal() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Get subdomain
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value

    if (!subdomain) {
      return { success: false, error: 'Tenant context not found' }
    }

    // Get tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single()

    if (!tenantData) {
      return { success: false, error: 'Tenant not found' }
    }

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin || userData.tenant_id !== tenantData.id) {
      return { success: false, error: 'Only tenant administrators can access billing' }
    }

    // Get billing info
    const { data: billing } = await supabase
      .from('tenant_billing')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantData.id)
      .single()

    if (!billing?.stripe_customer_id) {
      return { success: false, error: 'No billing account found' }
    }

    // Create billing portal session
    const session = await createBillingPortalSession({
      customerId: billing.stripe_customer_id,
      returnUrl: `https://${subdomain}.baselinedocs.com/admin/billing`,
    })

    return {
      success: true,
      portalUrl: session.url,
    }
  } catch (error: any) {
    logger.error('Failed to open billing portal', { error: error.message })
    return {
      success: false,
      error: error.message || 'Failed to open billing portal'
    }
  }
}
