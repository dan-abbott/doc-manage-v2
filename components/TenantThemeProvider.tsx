import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface TenantThemeProviderProps {
  children: React.ReactNode
}

export async function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const supabase = await createClient()
  
  // Try to get tenant from user's tenant_id
  let primaryColor = '#2E7DB5' // Default
  let secondaryColor = '#1E3A5F' // Default
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userData?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, secondary_color')
        .eq('id', userData.tenant_id)
        .single()

      if (tenant) {
        primaryColor = tenant.primary_color || primaryColor
        secondaryColor = tenant.secondary_color || secondaryColor
      }
    }
  } else {
    // If not authenticated, try to get tenant from cookie/subdomain
    const cookieStore = cookies()
    const tenantSubdomain = cookieStore.get('tenant_subdomain')?.value
    
    if (tenantSubdomain) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, secondary_color')
        .eq('subdomain', tenantSubdomain)
        .single()

      if (tenant) {
        primaryColor = tenant.primary_color || primaryColor
        secondaryColor = tenant.secondary_color || secondaryColor
      }
    }
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
        }
      `}</style>
      {children}
    </>
  )
}
