'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * Upgrade tenant plan (tenant admin action)
 */
export async function upgradeTenantPlan(data: {
  tenantId: string
  newPlan: string
}) {
  const supabase = await createClient()
  const cookieStore = cookies()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate plan
    const validPlans = ['starter', 'professional', 'enterprise']
    if (!validPlans.includes(data.newPlan)) {
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
      .select('id, subdomain')
      .eq('subdomain', subdomain)
      .single()

    if (!tenantData || tenantData.id !== data.tenantId) {
      return { success: false, error: 'Tenant mismatch' }
    }

    // Check admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, tenant_id')
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

    // Update billing
    const { error: updateError } = await supabase
      .from('tenant_billing')
      .update({
        plan: data.newPlan,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', data.tenantId)

    if (updateError) {
      logger.error('Failed to upgrade plan', { error: updateError, tenantId: data.tenantId })
      return { success: false, error: 'Failed to upgrade plan' }
    }

    // Log to billing history
    await supabase
      .from('billing_history')
      .insert({
        tenant_id: data.tenantId,
        action: 'plan_upgrade',
        previous_plan: currentBilling?.plan || 'trial',
        new_plan: data.newPlan,
        reason: `Tenant admin upgrade via billing page`,
        performed_by: user.id,
        performed_by_email: user.email || ''
      })

    logger.info('Plan upgraded successfully', {
      tenantId: data.tenantId,
      previousPlan: currentBilling?.plan,
      newPlan: data.newPlan,
      upgradedBy: user.email
    })

    revalidatePath('/admin/billing')

    const planNames: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise'
    }

    return {
      success: true,
      message: `Successfully upgraded to ${planNames[data.newPlan]} plan!`
    }
  } catch (error: any) {
    logger.error('Failed to upgrade plan', { error: error.message, tenantId: data.tenantId })
    return {
      success: false,
      error: error.message || 'Failed to upgrade plan'
    }
  }
}
