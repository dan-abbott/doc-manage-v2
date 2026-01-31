import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScanMonitoringClient from './ScanMonitoringClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminScanMonitoringPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/documents')
  }

  // Get all files with scan issues
  const { data: problemFiles } = await supabase
    .from('document_files')
    .select(`
      id,
      file_name,
      original_file_name,
      file_size,
      scan_status,
      scan_result,
      scanned_at,
      uploaded_at,
      uploaded_by,
      document:documents(
        id,
        document_number,
        version,
        title
      )
    `)
    .in('scan_status', ['pending', 'scanning', 'error'])
    .order('uploaded_at', { ascending: false })
    .limit(100)

  // Get recent blocked files
  const { data: blockedFiles } = await supabase
    .from('document_files')
    .select(`
      id,
      file_name,
      original_file_name,
      file_size,
      scan_status,
      scan_result,
      scanned_at,
      uploaded_at,
      uploaded_by,
      document:documents(
        id,
        document_number,
        version,
        title
      )
    `)
    .eq('scan_status', 'blocked')
    .order('scanned_at', { ascending: false })
    .limit(50)

  // Get scan statistics
  const { data: stats } = await supabase
    .from('document_files')
    .select('scan_status')

  const statistics = {
    total: stats?.length || 0,
    pending: stats?.filter(f => f.scan_status === 'pending').length || 0,
    scanning: stats?.filter(f => f.scan_status === 'scanning').length || 0,
    safe: stats?.filter(f => f.scan_status === 'safe').length || 0,
    error: stats?.filter(f => f.scan_status === 'error').length || 0,
    blocked: stats?.filter(f => f.scan_status === 'blocked').length || 0,
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Scan Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Monitor virus scanning status and manage problem files
        </p>
      </div>

      <ScanMonitoringClient
        problemFiles={problemFiles || []}
        blockedFiles={blockedFiles || []}
        statistics={statistics}
      />
    </div>
  )
}
