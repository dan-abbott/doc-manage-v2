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
  timezone: z.string().min(1, 'Timezone is required'),
})

/**
 * Upload company logo to Supabase Storage
 */
export async function uploadCompanyLogo(formData: FormData) {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Get user's tenant and verify admin
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Only administrators can upload logos' }
    }

    // Get the file
    const file = formData.get('logo') as File
    
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type - only PNG, JPG, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PNG, JPG, and SVG are allowed' }
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    // Get tenant subdomain for filename
    const { data: tenant } = await supabase
      .from('tenants')
      .select('subdomain')
      .eq('id', userData.tenant_id)
      .single()

    if (!tenant) {
      return { success: false, error: 'Tenant not found' }
    }

    // Generate filename: {subdomain}-logo.{extension}
    const fileExt = file.name.split('.').pop()
    const fileName = `${tenant.subdomain}-logo.${fileExt}`
    const filePath = `logos/${fileName}`

    // Upload to storage (upsert to replace existing logo)
    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Replace existing logo
      })

    if (uploadError) {
      console.error('Logo upload error:', uploadError)
      return { success: false, error: uploadError.message || 'Failed to upload logo' }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    // Update tenant with logo URL
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.tenant_id)

    if (updateError) {
      console.error('Update tenant error:', updateError)
      return { success: false, error: 'Failed to save logo URL' }
    }

    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/admin/settings')

    return { 
      success: true,
      logoUrl: publicUrl,
      message: 'Logo uploaded successfully'
    }

  } catch (error: any) {
    console.error('Upload logo error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to upload logo' 
    }
  }
}

/**
 * Update company settings
 */
export async function updateCompanySettings(data: {
  company_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  auto_rename_files: boolean
  timezone: string
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
        timezone: validation.data.timezone,
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
