import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/dashboard/Navigation'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Document Control System',
  description: 'Manage and track your documents',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's admin status if authenticated
  let isAdmin = false
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    isAdmin = userData?.is_admin || false
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Show styled navigation only when user is authenticated */}
        {user && <Navigation user={{ email: user.email || '' }} isAdmin={isAdmin} />}
        
        {/* Main content */}
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </main>
      </body>
    </html>
  )
}
