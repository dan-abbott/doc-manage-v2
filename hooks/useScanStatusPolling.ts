'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that polls for pending file scans and refreshes when they complete
 * 
 * @param fileIds - Array of file IDs to monitor
 * @param enabled - Whether polling is enabled
 * @param intervalMs - Polling interval in milliseconds (default: 3000 = 3 seconds)
 */
export function useScanStatusPolling(
  fileIds: string[] = [],
  enabled: boolean = true,
  intervalMs: number = 3000
) {
  const router = useRouter()
  const [isPolling, setIsPolling] = useState(false)
  const lastPendingCountRef = useRef<number>(fileIds.length)

  useEffect(() => {
    if (!enabled || fileIds.length === 0) {
      return
    }

    let intervalId: NodeJS.Timeout | null = null
    let isMounted = true

    const checkScanStatus = async () => {
      if (!isMounted) return

      try {
        setIsPolling(true)

        const response = await fetch('/api/check-scan-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds }),
        })

        if (!response.ok) {
          console.error('[Scan Poll] API error:', response.status)
          return
        }

        const data = await response.json()

        // Check if pending count decreased (a file completed)
        if (data.pendingCount < lastPendingCountRef.current) {
          console.log('[Scan Poll] File completed! Refreshing...', {
            was: lastPendingCountRef.current,
            now: data.pendingCount
          })
          router.refresh() // Refresh to show updated badge
          lastPendingCountRef.current = data.pendingCount
        }

        // If all files done scanning - stop polling
        if (data.pendingCount === 0) {
          console.log('[Scan Poll] All scans complete')
          
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
        } else {
          console.log('[Scan Poll]', data.pendingCount, 'files still scanning')
        }
      } catch (error) {
        console.error('[Scan Poll] Error:', error)
      } finally {
        if (isMounted) {
          setIsPolling(false)
        }
      }
    }

    // Initialize the ref
    lastPendingCountRef.current = fileIds.length

    // Start polling
    intervalId = setInterval(checkScanStatus, intervalMs)
    
    // Check immediately
    checkScanStatus()

    // Cleanup
    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fileIds, enabled, intervalMs, router])

  return { isPolling }
}
