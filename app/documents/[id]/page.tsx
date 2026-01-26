import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Fetch the document to get its document_number
  const { data: document } = await supabase
    .from('documents')
    .select('document_number')
    .eq('id', params.id)
    .single()

  if (document) {
    // Redirect to new URL pattern with document_number
    redirect(`/documents?selected=${document.document_number}`)
  } else {
    // Document not found, redirect to documents list
    redirect('/documents')
  }
}
