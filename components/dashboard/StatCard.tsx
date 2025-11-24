import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: LucideIcon
  href: string
}

export default function StatCard({ title, value, description, icon: Icon, href }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-blue-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <p className="text-xs text-gray-500 mt-1">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
