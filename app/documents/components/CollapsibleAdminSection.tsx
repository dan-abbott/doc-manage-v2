'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollapsibleAdminSectionProps {
  children: React.ReactNode
}

export default function CollapsibleAdminSection({ children }: CollapsibleAdminSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="mb-6 border-yellow-300 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-900 text-base">Admin Actions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 text-yellow-900 hover:bg-yellow-100"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}
