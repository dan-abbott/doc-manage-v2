import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText } from 'lucide-react'
import DocumentsTable from './DocumentsTable'
import DocumentsFilters from './DocumentsFilters'
import AdminViewAllToggle from './AdminViewAllToggle'

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: {
    search?: string
    type?: string
    status?: string
    project?: string
    filter?: string
    page?: string
    viewAll?: string  // NEW: Admin view all parameter
  }
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
 
 // DEBUG: Log user info
  console.log('=== DEBUG ===')
  console.log('User ID:', user?.id)
  console.log('User email:', user?.email)

   // Try a direct query without RLS to test
  const { data: testData, error: testError } = await supabase
    .from('documents')
    .select('id, document_number, status, created_by')
    .limit(5)
  
  console.log('Test query result:', testData)
  console.log('Test query error:', testError)
  console.log('=== END DEBUG ===')
 
  if (!user) {
    redirect('/auth/login')
  }

  // NEW: Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = userData?.is_admin || false
  const viewAll = searchParams.viewAll === 'true'

  // Get document types for filter
  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Build query
  const page = parseInt(searchParams.page || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('documents')
    .select(`
      *,
      document_type:document_types(name, prefix)
    `, { count: 'exact' })

  // NEW: Apply RLS based on admin status and viewAll toggle
  // If admin with viewAll enabled, no filter (see everything)
  // Otherwise, apply normal RLS (own drafts + all released/obsolete)
  if (!isAdmin || !viewAll) {
    // Normal users and admins without viewAll:
    // See own Drafts + all Released/Obsolete
    query = query.or(`created_by.eq.${user.id},status.eq.Released,status.eq.Obsolete`)
  }
  // If admin with viewAll=true, no filter applied - see everything

  // Search filter
  if (searchParams.search) {
    const searchTerm = `%${searchParams.search}%`
    query = query.or(`document_number.ilike.${searchTerm},title.ilike.${searchTerm}`)
  }

  // Type filter
  if (searchParams.type) {
    query = query.eq('document_type_id', searchParams.type)
  }

  // Status filter
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  // Project filter
  if (searchParams.project) {
    query = query.eq('project_code', searchParams.project.toUpperCase())
  }

  // My Documents filter
  // Shows documents where user created THIS version OR ANY version of the same document
  if (searchParams.filter === 'my') {
    // First, get all document_numbers where user created at least one version
    const { data: userDocNumbers } = await supabase
      .from('documents')
      .select('document_number')
      .eq('created_by', user.id)
    
    if (userDocNumbers && userDocNumbers.length > 0) {
      const docNumbers = [...new Set(userDocNumbers.map(d => d.document_number))]
      query = query.in('document_number', docNumbers)
    } else {
      // User hasn't created any documents, show empty result
      query = query.eq('created_by', user.id)
    }
  }

  // Pagination and sorting
  query = query
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data: documents, error, count } = await query

  if (error) {
    console.error('Error fetching documents:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {searchParams.filter === 'my' ? 'My Documents' : 'All Documents'}
          </h1>
          <p className="text-muted-foreground">
            {count !== null ? `${count} ${searchParams.filter === 'my' ? 'document' : 'total document'}${count === 1 ? '' : 's'}` : 'Loading...'}
          </p>
        </div>
        <Button asChild>
          <Link href="/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

      {/* NEW: Admin View All Toggle */}
      {isAdmin && (
        <div className="mb-4">
          <AdminViewAllToggle />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsFilters 
            documentTypes={documentTypes || []}
            currentFilters={searchParams}
          />
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="pt-6">
          {documents && documents.length > 0 ? (
            <>
              <DocumentsTable documents={documents} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link
                        href={{
                          pathname: '/documents',
                          query: { ...searchParams, page: String(page - 1) },
                        }}
                      >
                        Previous
                      </Link>
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link
                        href={{
                          pathname: '/documents',
                          query: { ...searchParams, page: String(page + 1) },
                        }}
                      >
                        Next
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchParams.search || searchParams.type || searchParams.status || searchParams.project
                  ? 'Try adjusting your filters'
                  : 'Get started by creating a new document'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
