import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import ScanMonitoringClient from './ScanMonitoringClient'
import { Button } from '@/components/ui/button'
import { ShieldOff } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminScanMonitoringPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.is_admin) {
    redirect('/documents')
  }

  // ⭐ GET TENANT FROM SUBDOMAIN (not user's home tenant)
  const subdomainCookie = cookieStore.get('tenant_subdomain')
  const subdomain = subdomainCookie?.value

  let tenantId = userData.tenant_id

  if (subdomain) {
    const { data: subdomainTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single()
    
    if (subdomainTenant) {
      tenantId = subdomainTenant.id
    }
  }

  // Get virus scan status from tenants table
  const { data: tenant } = await supabase
    .from('tenants')
    .select('virus_scan_enabled')
    .eq('id', tenantId)
    .single()

  const virusScanEnabled = tenant?.virus_scan_enabled ?? true

  // If virus scanning is disabled, show a disabled state
  if (!virusScanEnabled) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Scan Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Virus scanning is currently disabled for this tenant
          </p>
        </div>
        
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <ShieldOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Virus Scanning Disabled
            </h3>
            <p className="text-gray-600 mb-4">
              Virus scanning is currently disabled in company settings. 
              Enable it to start monitoring file scans.
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/settings">
                Go to Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ⭐ FIX 2: Use service role client and filter by tenant
  const supabaseAdmin = createServiceRoleClient()

  // Get all files with scan issues FOR THIS TENANT
  const { data: problemFiles } = await supabaseAdmin
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
      document_id,
      documents!inner(
        id,
        document_number,
        version,
        title,
        tenant_id
      )
    `)
    .eq('documents.tenant_id', tenantId)
    .in('scan_status', ['pending', 'scanning', 'error'])
    .order('uploaded_at', { ascending: false })
    .limit(100)

  // Get recent blocked files FOR THIS TENANT
  const { data: blockedFiles } = await supabaseAdmin
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
      document_id,
      documents!inner(
        id,
        document_number,
        version,
        title,
        tenant_id
      )
    `)
    .eq('documents.tenant_id', tenantId)
    .eq('scan_status', 'blocked')
    .order('scanned_at', { ascending: false })
    .limit(50)

  // Transform to match client component type
  const transformedProblemFiles = problemFiles?.map(file => ({
    ...file,
    document: Array.isArray(file.documents) ? file.documents[0] : file.documents
  })) || []

  const transformedBlockedFiles = blockedFiles?.map(file => ({
    ...file,
    document: Array.isArray(file.documents) ? file.documents[0] : file.documents
  })) || []

  // Get scan statistics FOR THIS TENANT ONLY
  const { data: stats } = await supabaseAdmin
    .from('document_files')
    .select('scan_status, documents!inner(tenant_id)')
    .eq('documents.tenant_id', tenantId)

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
        problemFiles={transformedProblemFiles}
        blockedFiles={transformedBlockedFiles}
        statistics={statistics}
      />
    </div>
  )
}
