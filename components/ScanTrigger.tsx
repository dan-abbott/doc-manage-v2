'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Shield, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ScanTriggerProps {
  className?: string
}

export function ScanTrigger({ className = '' }: ScanTriggerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPendingFiles, setHasPendingFiles] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Check for pending files on mount and every 30 seconds
  useEffect(() => {
    checkForPendingFiles()
    const interval = setInterval(checkForPendingFiles, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkForPendingFiles() {
    try {
      const response = await fetch('/api/check-scan-status')
      const data = await response.json()
      setHasPendingFiles(data.pendingCount > 0)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Failed to check scan status:', error)
    }
  }

  async function triggerScan() {
    setIsScanning(true)
    try {
      toast.info('Starting virus scan...')
      
      const response = await fetch('/api/scan-pending-files')
      const data = await response.json()

      if (data.success) {
        if (data.scanned === 0) {
          toast.success('No pending files to scan')
        } else {
          toast.success(
            `Scanned ${data.scanned} file(s): ${data.summary.safe} safe, ${data.summary.blocked} blocked`
          )
        }
        await checkForPendingFiles()
        // Refresh the page to show updated badges
        window.location.reload()
      } else {
        toast.error('Scan failed: ' + data.error)
      }
    } catch (error) {
      console.error('Scan trigger error:', error)
      toast.error('Failed to trigger scan')
    } finally {
      setIsScanning(false)
    }
  }

  if (!hasPendingFiles) {
    return null // Don't show button if no pending files
  }

  return (
    <Button
      onClick={triggerScan}
      disabled={isScanning}
      variant="outline"
      size="sm"
      className={className}
    >
      {isScanning ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Scanning...
        </>
      ) : (
        <>
          <Shield className="h-4 w-4 mr-2" />
          Scan Pending Files
        </>
      )}
    </Button>
  )
}
