'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface DocumentsTableProps {
  documents: any[]
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-500',
  'In Approval': 'bg-yellow-500',
  Released: 'bg-green-500',
  Obsolete: 'bg-gray-700',
}

export default function DocumentsTable({ documents }: DocumentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow 
              key={doc.id}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell>
                <Link 
                  href={`/documents/${doc.id}`}
                  className="font-medium hover:underline"
                >
                  {doc.document_number}{doc.version}
                </Link>
              </TableCell>
              <TableCell>
                <Link 
                  href={`/documents/${doc.id}`}
                  className="hover:underline"
                >
                  {doc.title}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {doc.document_type?.name || 'Unknown'}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[doc.status] || 'bg-gray-500'}>
                  {doc.status}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm font-mono">
                  {doc.project_code || '—'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {doc.is_production ? 'Production' : 'Prototype'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
