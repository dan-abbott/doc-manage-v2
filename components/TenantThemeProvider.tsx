import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface TenantThemeProviderProps {
  children: React.ReactNode
}

export async function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const supabase = await createClient()
  
  // Defaults
  let primaryColor = '#2E7DB5'
  let secondaryColor = '#1E3A5F'
  let backgroundStartColor = '#F8FAFC' // slate-50
  let backgroundEndColor = '#E2E8F0' // slate-200
  
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('🎨 [TenantThemeProvider] Component called')
  
  // Always use subdomain tenant (from cookie), not user's home tenant
  const cookieStore = await cookies()
  const tenantSubdomain = cookieStore.get('tenant_subdomain')?.value
  
  console.log('🎨 [TenantThemeProvider] Subdomain from cookie:', tenantSubdomain)
  
  if (tenantSubdomain) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('primary_color, secondary_color, background_start_color, background_end_color')
      .eq('subdomain', tenantSubdomain)
      .single()

    console.log('🎨 [TenantThemeProvider] Tenant query:', {
      subdomain: tenantSubdomain,
      found: !!tenant,
      error: error?.message,
      colors: tenant ? {
        primary: tenant.primary_color,
        secondary: tenant.secondary_color,
        bgStart: tenant.background_start_color,
        bgEnd: tenant.background_end_color
      } : 'none'
    })

    if (tenant) {
      primaryColor = tenant.primary_color || primaryColor
      secondaryColor = tenant.secondary_color || secondaryColor
      backgroundStartColor = tenant.background_start_color || backgroundStartColor
      backgroundEndColor = tenant.background_end_color || backgroundEndColor
    }
  } else if (user) {
    // Fallback to user's home tenant if no subdomain cookie
    console.log('🎨 [TenantThemeProvider] No subdomain cookie, checking user fallback')
    
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userData?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, secondary_color, background_start_color, background_end_color')
        .eq('id', userData.tenant_id)
        .single()

      if (tenant) {
        primaryColor = tenant.primary_color || primaryColor
        secondaryColor = tenant.secondary_color || secondaryColor
        backgroundStartColor = tenant.background_start_color || backgroundStartColor
        backgroundEndColor = tenant.background_end_color || backgroundEndColor
      }
    }
  }

  const styleContent = `
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --background-start: ${backgroundStartColor};
      --background-end: ${backgroundEndColor};
    }
    
    /* Apply gradient to body with high specificity - fixed attachment keeps it in place */
    html body {
      background: linear-gradient(to bottom right, ${backgroundStartColor}, ${backgroundEndColor}) !important;
      background-attachment: fixed !important;
      min-height: 100vh;
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      {children}
    </>
  )
}
