import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Use document.cookie for client-side
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
          return value
        },
        set(name: string, value: string, options: any) {
          // Set cookie with domain to work across subdomains
          const domain = '.baselinedocs.com'
          const secure = window.location.protocol === 'https:'
          const sameSite = 'Lax'
          const maxAge = options.maxAge || 60 * 60 * 24 * 365 // 1 year default
          
          document.cookie = `${name}=${value}; path=/; domain=${domain}; max-age=${maxAge}; samesite=${sameSite}${secure ? '; secure' : ''}`
        },
        remove(name: string, options: any) {
          // Remove cookie with domain
          const domain = '.baselinedocs.com'
          document.cookie = `${name}=; path=/; domain=${domain}; max-age=0`
        },
      },
    }
  )
}
