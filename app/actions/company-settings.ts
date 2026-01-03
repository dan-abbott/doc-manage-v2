// app/actions/company-settings.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const companySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(100),
  logo_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  auto_rename_files: z.boolean(),
})

export async function updateCompanySettings(data: {
  company_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  auto_rename_files: boolean
}) {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate inputs
    const validation = companySettingsSchema.safeParse(data)
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.errors[0].message 
      }
    }

    // Get user's tenant and verify admin
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Only administrators can update company settings' }
    }

    // Update tenant settings
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        company_name: validation.data.company_name,
        logo_url: validation.data.logo_url,
        primary_color: validation.data.primary_color,
        secondary_color: validation.data.secondary_color,
        auto_rename_files: validation.data.auto_rename_files,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.tenant_id)

    if (updateError) {
      console.error('Update tenant error:', updateError)
      throw updateError
    }

    // Revalidate pages that use tenant settings
    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/admin/settings')

    return { 
      success: true,
      message: 'Company settings updated successfully'
    }

  } catch (error: any) {
    console.error('Update company settings error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update company settings' 
    }
  }
}

/**
 * Get current tenant settings
 */
export async function getCompanySettings() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated', data: null }
    }

    // Get user's tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return { success: false, error: 'User not found', data: null }
    }

    // Get tenant settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userData.tenant_id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: tenant }

  } catch (error: any) {
    console.error('Get company settings error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to get company settings',
      data: null
    }
  }
}
