import { redirect } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  // Redirect to new URL pattern with selected parameter
  redirect(`/documents?selected=${params.id}`)
}
