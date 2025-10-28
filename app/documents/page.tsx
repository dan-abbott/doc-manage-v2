import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import DocumentsTable from './DocumentsTable'
import DocumentsFilters from './DocumentsFilters'

interface PageProps {
  searchParams: {
    search?: string
    type?: string
    status?: string
    project?: string
    page?: string
  }
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const supabase = await createServerClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

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

  // Apply RLS: user sees their own Drafts + all Released/Obsolete
  // (RLS handles this automatically)

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
          <h1 className="text-3xl font-bold">All Documents</h1>
          <p className="text-muted-foreground">
            {count !== null ? `${count} total documents` : 'Loading...'}
          </p>
        </div>
        <Button asChild>
          <Link href="/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

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
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link 
                          href={{
                            pathname: '/documents',
                            query: { ...searchParams, page: (page - 1).toString() }
                          }}
                        >
                          Previous
                        </Link>
                      </Button>
                    )}
                    {page < totalPages && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link 
                          href={{
                            pathname: '/documents',
                            query: { ...searchParams, page: (page + 1).toString() }
                          }}
                        >
                          Next
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchParams.search || searchParams.type || searchParams.status || searchParams.project
                  ? 'No documents match your filters'
                  : 'No documents yet'}
              </p>
              <Button asChild>
                <Link href="/documents/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Document
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
