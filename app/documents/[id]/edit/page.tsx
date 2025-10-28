import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import EditDocumentForm from './EditDocumentForm'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditDocumentPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get document
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_type:document_types(id, name, prefix),
      document_files(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !document) {
    notFound()
  }

  // Check permissions
  if (document.created_by !== user.id) {
    redirect('/documents')
  }

  if (document.status !== 'Draft') {
    redirect(`/documents/${params.id}`)
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Document</CardTitle>
          <CardDescription>
            Modify document details and manage file attachments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditDocumentForm document={document} />
        </CardContent>
      </Card>
    </div>
  )
}
