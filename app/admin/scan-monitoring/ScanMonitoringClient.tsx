'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  AlertCircle, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  Loader2,
  Play
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface FileData {
  id: string
  file_name: string
  original_file_name: string
  file_size: number
  scan_status: string
  scan_result: any
  scanned_at: string | null
  uploaded_at: string
  uploaded_by: string
  document: {
    id: string
    document_number: string
    version: string
    title: string
  }
}

interface Props {
  problemFiles: FileData[]
  blockedFiles: FileData[]
  statistics: {
    total: number
    pending: number
    scanning: number
    safe: number
    error: number
    blocked: number
  }
}

export default function ScanMonitoringClient({ 
  problemFiles, 
  blockedFiles, 
  statistics 
}: Props) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [triggeringScans, setTriggeringScans] = useState<Set<string>>(new Set())

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleTriggerScan = async (fileId: string) => {
    setTriggeringScans(prev => new Set(prev).add(fileId))
    
    try {
      const response = await fetch('/api/admin/trigger-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Scan triggered successfully')
        // Refresh after a delay to show the update
        setTimeout(() => router.refresh(), 2000)
      } else {
        toast.error(data.error || 'Failed to trigger scan')
      }
    } catch (error) {
      console.error('Trigger scan error:', error)
      toast.error('Failed to trigger scan')
    } finally {
      setTriggeringScans(prev => {
        const next = new Set(prev)
        next.delete(fileId)
        return next
      })
    }
  }

  const handleTriggerBulkScan = async () => {
    const pendingAndErrorFiles = problemFiles
      .filter(f => f.scan_status === 'pending' || f.scan_status === 'error')
      .map(f => f.id)

    if (pendingAndErrorFiles.length === 0) {
      toast.info('No files need scanning')
      return
    }

    setIsRefreshing(true)

    try {
      toast.info(`Triggering scans for ${pendingAndErrorFiles.length} files...`)

      const response = await fetch('/api/admin/trigger-bulk-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: pendingAndErrorFiles }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`${data.triggered} scan(s) triggered successfully`)
        setTimeout(() => router.refresh(), 2000)
      } else {
        toast.error(data.error || 'Failed to trigger scans')
      }
    } catch (error) {
      console.error('Bulk trigger error:', error)
      toast.error('Failed to trigger bulk scans')
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      scanning: { color: 'bg-blue-100 text-blue-800', icon: Loader2 },
      safe: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      error: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      blocked: { color: 'bg-red-100 text-red-800', icon: XCircle },
    }[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }

    const Icon = variants.icon

    return (
      <Badge variant="outline" className={variants.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Scanning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.scanning}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Safe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.safe}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.error}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Blocked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.blocked}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>

        {(statistics.pending > 0 || statistics.error > 0) && (
          <Button
            onClick={handleTriggerBulkScan}
            disabled={isRefreshing}
          >
            <Play className="h-4 w-4 mr-2" />
            Trigger All Pending/Error Scans ({statistics.pending + statistics.error})
          </Button>
        )}
      </div>

      {/* Problem Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Files Needing Attention ({problemFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {problemFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">All files scanned successfully!</p>
              <p className="text-sm">No pending, scanning, or error files.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {problemFiles.map(file => (
                <div
                  key={file.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(file.scan_status)}
                        <span className="text-sm font-medium truncate">
                          {file.file_name}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Document: {file.document.document_number}{file.document.version} - {file.document.title}
                        </div>
                        <div className="flex gap-4">
                          <span>Size: {formatFileSize(file.file_size)}</span>
                          <span>
                            Uploaded: {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                          </span>
                        </div>
                        {file.scan_result?.error && (
                          <div className="text-red-600 text-xs mt-1">
                            Error: {file.scan_result.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleTriggerScan(file.id)}
                      disabled={triggeringScans.has(file.id) || file.scan_status === 'scanning'}
                    >
                      {triggeringScans.has(file.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Triggering...
                        </>
                      ) : file.scan_status === 'scanning' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1" />
                          {file.scan_status === 'error' ? 'Retry Scan' : 'Trigger Scan'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Blocked Files */}
      {blockedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Recently Blocked Files ({blockedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedFiles.map(file => (
                <div
                  key={file.id}
                  className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(file.scan_status)}
                        <span className="text-sm font-medium truncate">
                          {file.original_file_name}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Document: {file.document.document_number}{file.document.version} - {file.document.title}
                        </div>
                        <div className="flex gap-4">
                          <span>Size: {formatFileSize(file.file_size)}</span>
                          {file.scanned_at && (
                            <span>
                              Blocked: {formatDistanceToNow(new Date(file.scanned_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {file.scan_result && (
                          <div className="text-red-700 text-xs mt-1 font-medium">
                            ⚠️ Threats detected: {file.scan_result.malicious || 0} malicious, {file.scan_result.suspicious || 0} suspicious
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
