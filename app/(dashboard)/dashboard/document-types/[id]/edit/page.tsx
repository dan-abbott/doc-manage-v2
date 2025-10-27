import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDocumentType } from '@/app/actions/document-types';
import DocumentTypeForm from '@/components/document-types/DocumentTypeForm';

export default async function EditDocumentTypePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/');
  }

  // Check admin access
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    redirect('/dashboard');
  }

  // Get document type
  const result = await getDocumentType(params.id);
  if (!result.success || !result.data) {
    notFound();
  }

  const documentType = result.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Edit Document Type</h1>
          <p className="mt-2 text-slate-600">
            Update the document type configuration
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <DocumentTypeForm mode="edit" documentType={documentType} />
        </div>
      </div>
    </div>
  );
}
