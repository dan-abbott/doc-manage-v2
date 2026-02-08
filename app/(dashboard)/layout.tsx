import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductTour from '@/components/onboarding/ProductTour';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Navigation is now handled by root layout
  // This layout provides consistent padding for all dashboard pages
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
      
      {/* Product Tour - only shows on first login */}
      <ProductTour />
    </div>
  );
}
