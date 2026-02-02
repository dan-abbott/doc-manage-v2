'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/users', label: 'User Management' },
  { href: '/admin/settings', label: 'Company Settings' },
  { href: '/admin/document-types', label: 'Document Types' },
  { href: '/admin/scan-monitoring', label: 'Scan Monitoring' },
]

export default function AdminNavTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-6">
      <nav className="flex space-x-4 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
