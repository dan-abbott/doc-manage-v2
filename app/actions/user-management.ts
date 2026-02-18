// Enhanced debugging version for user limit check
// Replace lines 383-421 in app/actions/user-management.ts

    console.log('🔍 [User Limit Check] Starting user limit validation')
    console.log('🔍 [User Limit Check] Subdomain:', subdomain)
    console.log('🔍 [User Limit Check] Target Tenant ID:', targetTenantId)

    // Get tenant's user limit from billing (not hardcoded!)
    const { data: billingData, error: billingError } = await supabase
      .from('tenant_billing')
      .select('plan, user_limit')
      .eq('tenant_id', targetTenantId)
      .single()

    console.log('🔍 [User Limit Check] Billing query result:', {
      billingData,
      billingError: billingError?.message
    })

    if (!billingData) {
      console.error('❌ [User Limit Check] No billing data found for tenant:', targetTenantId)
      return { success: false, error: 'Unable to determine plan limits' }
    }

    const currentPlan = billingData.plan
    const userLimit = billingData.user_limit

    console.log('🔍 [User Limit Check] Plan details:', {
      currentPlan,
      userLimit,
      userLimitType: typeof userLimit
    })

    // Count users in tenant (include all except Deactivated role)
    console.log('🔍 [User Limit Check] Counting existing users...')
    console.log('🔍 [User Limit Check] Query: tenant_id =', targetTenantId, ', role !=', 'Deactivated')
    
    const { count: userCount, error: countError, data: debugUsers } = await supabase
      .from('users')
      .select('id, email, role, is_active', { count: 'exact' })
      .eq('tenant_id', targetTenantId)
      .neq('role', 'Deactivated')

    console.log('🔍 [User Limit Check] User count result:', {
      userCount,
      countError: countError?.message,
      actualUsers: debugUsers?.length,
      users: debugUsers?.map(u => ({ email: u.email, role: u.role, is_active: u.is_active }))
    })

    if (countError) {
      console.error('❌ [User Limit Check] Failed to count users:', countError)
      logger.error('Failed to count users', { error: countError })
      return { success: false, error: 'Failed to check user limits' }
    }

    console.log('🔍 [User Limit Check] Comparison:', {
      userCount,
      userLimit,
      wouldBlock: userCount !== null && userCount >= userLimit,
      calculation: `${userCount} >= ${userLimit} = ${userCount !== null && userCount >= userLimit}`
    })

    // Log the check for debugging
    logger.info('User limit check', {
      currentPlan,
      userLimit,
      userCount,
      targetTenantId,
      attemptingToAdd: data.email
    })

    if (userCount !== null && userCount >= userLimit) {
      const planNames: Record<string, string> = {
        trial: 'Trial',
        starter: 'Starter',
        professional: 'Professional',
        enterprise: 'Enterprise'
      }
      
      console.log('🚫 [User Limit Check] LIMIT REACHED - Blocking user creation')
      console.log('🚫 [User Limit Check] Details:', {
        plan: currentPlan,
        planName: planNames[currentPlan],
        limit: userLimit,
        current: userCount,
        attemptedEmail: data.email
      })
      
      logger.warn('User limit reached', {
        plan: currentPlan,
        limit: userLimit,
        current: userCount,
        attemptedBy: user.email,
        attemptedEmail: data.email
      })
      
      return {
        success: false,
        error: `Your ${planNames[currentPlan] || currentPlan} plan is limited to ${userLimit} users. Please upgrade your plan to add more users.`,
        requiresUpgrade: true,
        currentPlan,
        userLimit,
        currentUsers: userCount
      }
    }

    console.log('✅ [User Limit Check] PASSED - User count within limit')
    console.log('✅ [User Limit Check] Proceeding with user creation...')
