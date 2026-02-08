'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FeedbackButton } from '@/components/FeedbackButton'

type Props = {
  user: {
    email: string;
    fullName: string;
  };
  isAdmin: boolean;
  userRole: string | null;
};

export default function Navigation({ user, isAdmin }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch company logo
  useEffect(() => {
    async function fetchLogo() {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', currentUser.id)
          .single();

        if (userData?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('logo_url')
            .eq('id', userData.tenant_id)
            .single();

          if (tenant?.logo_url) {
            setCompanyLogo(tenant.logo_url);
          }
        }
      }
    }
    
    fetchLogo();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/documents', label: 'All Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/approvals', label: 'Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/bookmarks', label: 'Bookmarks', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { href: '/help', label: 'Help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  // Add admin-only link
  if (isAdmin) {
    navItems.push({
      href: '/admin/users',
      label: 'Admin Panel',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    });
  }

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Left side - Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              {/* Baseline Docs Logo - STATIC COLORS */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className="h-8 w-8">
                <rect x="100" y="80" width="200" height="240" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
                <path d="M 300 80 L 300 120 L 260 120 Z" fill="#2E7DB5"/>
                <path d="M 260 120 L 300 120 L 300 80" fill="none" stroke="#2E7DB5" strokeWidth="8" strokeLinejoin="miter"/>
                <rect x="130" y="130" width="90" height="8" rx="4" fill="#2E7DB5"/>
                <rect x="130" y="160" width="140" height="8" rx="4" fill="#2E7DB5"/>
                <rect x="130" y="190" width="140" height="8" rx="4" fill="#6B7280"/>
                <rect x="130" y="220" width="90" height="8" rx="4" fill="#6B7280"/>
                <rect x="80" y="240" width="240" height="12" rx="6" fill="#1E3A5F"/>
                <path d="M 200 250 L 190 280 L 200 290 L 210 280 Z" fill="#2E7DB5"/>
                <rect x="110" y="280" width="180" height="40" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
              </svg>
              <span className="text-lg font-bold text-gray-900 hidden lg:inline">Baseline Docs</span>
              
              {/* Company Logo */}
              {companyLogo && (
                <>
                  <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
                  <div className="relative h-6 w-24 hidden lg:block">
                    <Image
                      src={companyLogo}
                      alt="Company logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                </>
              )}
            </Link>
          </div>

          {/* Center - Nav items */}
          <div className="hidden sm:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-2 py-2 text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'border-b-2'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={isActive ? { 
                    color: 'var(--primary-color, #2563eb)',
                    borderColor: 'var(--primary-color, #2563eb)'
                  } : {}}
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side - Feedback & User menu */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <FeedbackButton />
            
            {/* User Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 whitespace-nowrap"
              >
                <span className="hidden md:inline truncate max-w-[150px]">
                  {user.fullName || user.email}
                </span>
                <span className="md:hidden">Account</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <Link
                    href="/settings/notifications"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Email Notifications
                  </Link>

                  <div className="border-t border-slate-200 my-1"></div>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden border-t border-slate-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive
                    ? 'bg-blue-50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
                style={isActive ? { color: 'var(--primary-color, #2563eb)' } : {}}
              >
                {item.label}
              </Link>
            );
          })}
          {/* Mobile - Settings Link */}
          <Link
            href="/settings/notifications"
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            Email Notifications
          </Link>
        </div>
      </div>
    </nav>
  );
}
