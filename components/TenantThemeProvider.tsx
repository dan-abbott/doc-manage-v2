// TenantThemeProvider
//
// Previously fetched per-tenant primary/secondary/background colors from Supabase
// and injected them as CSS custom properties. Tenant color customization has been
// removed — colors are now fixed to the ClearStride brand system (brand tokens in
// globals.css). The component shell is preserved so the root layout import continues
// to work without changes.
//
// Tenant logo (co-brand) is still fetched directly in Navigation.tsx.

interface TenantThemeProviderProps {
  children: React.ReactNode
}

export async function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  return <>{children}</>
}
