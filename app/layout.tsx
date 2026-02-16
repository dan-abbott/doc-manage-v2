import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/dashboard/Navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import { TenantThemeProvider } from '@/components/TenantThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BaselineDocs',
  description: 'Professional Document Control & Version Management',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's admin status and role if authenticated
  let isAdmin = false
  let fullName = ''
  let userRole = null
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, full_name, role')
      .eq('id', user.id)
      .single()
    
    isAdmin = userData?.is_admin || false
    fullName = userData?.full_name || ''
    userRole = userData?.role || null
  }

return (
    <html lang="en">
      <body className={inter.className}>
        <TenantThemeProvider>
          {/* Show styled navigation only when user is authenticated */}
          {user && <Navigation user={{ email: user.email || '', fullName }} isAdmin={isAdmin} userRole={userRole} />}
          
          {/* Main content - gradient applied via TenantThemeProvider */}
          <main className="min-h-screen">
            {children}
          </main>
          
          {/* Toast notifications */}
          <Toaster position="top-right" />
        </TenantThemeProvider>
      </body>
    </html>
  )

}
