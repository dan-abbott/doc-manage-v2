'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { ShieldCheck } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AdminViewAllToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewAll, setViewAll] = useState(false)

  // Read initial state from URL
  useEffect(() => {
    setViewAll(searchParams.get('viewAll') === 'true')
  }, [searchParams])

  const handleToggle = (checked: boolean) => {
    setViewAll(checked)
    
    // Update URL with viewAll parameter
    const params = new URLSearchParams(searchParams.toString())
    if (checked) {
      params.set('viewAll', 'true')
    } else {
      params.delete('viewAll')
    }
    
    router.push(`/documents?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <ShieldCheck className="h-4 w-4 text-amber-600" />
      <Label htmlFor="view-all" className="text-sm font-medium text-amber-900 cursor-pointer flex-1">
        View All Documents (Including Others' Drafts)
      </Label>
      <input
        type="checkbox"
        id="view-all"
        checked={viewAll}
        onChange={(e) => handleToggle(e.target.checked)}
        className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
      />
    </div>
  )
}
