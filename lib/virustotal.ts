/**
 * VirusTotal Integration for File Scanning
 * 
 * Provides virus scanning capabilities using VirusTotal API v3
 * Supports both file upload scanning and hash-based scanning
 */

interface VirusTotalScanResult {
  safe: boolean
  malicious: number
  suspicious: number
  undetected: number
  harmless: number
  total: number
  scanId?: string
  permalink?: string
  engines?: {
    [key: string]: {
      category: string
      result: string | null
    }
  }
}

interface VirusTotalError {
  error: string
  details?: any
}

/**
 * Upload a file to VirusTotal for scanning
 * @param file - File buffer to scan
 * @param fileName - Original file name
 * @returns Scan result or error
 */
export async function scanFile(
  file: Buffer | ArrayBuffer,
  fileName: string
): Promise<VirusTotalScanResult | VirusTotalError> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY

  if (!apiKey) {
    console.error('[VirusTotal] API key not configured')
    return { 
      error: 'VirusTotal API key not configured',
      details: 'VIRUSTOTAL_API_KEY environment variable is missing'
    }
  }

  try {
    // Convert to Uint8Array for Blob creation
    const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file)
    const uint8Array = new Uint8Array(fileBuffer)

    // Create form data for file upload
    const formData = new FormData()
    const blob = new Blob([uint8Array])
    formData.append('file', blob, fileName)

    console.log(`[VirusTotal] Uploading file for scan: ${fileName} (${fileBuffer.length} bytes)`)

    // Upload file to VirusTotal
    const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[VirusTotal] Upload failed:', uploadResponse.status, errorText)
      return {
        error: `VirusTotal upload failed: ${uploadResponse.status}`,
        details: errorText
      }
    }

    const uploadData = await uploadResponse.json()
    const analysisId = uploadData.data?.id

    if (!analysisId) {
      console.error('[VirusTotal] No analysis ID returned')
      return { error: 'No analysis ID returned from VirusTotal' }
    }

    console.log(`[VirusTotal] File uploaded, analysis ID: ${analysisId}`)

    // Poll for results (VirusTotal scans can take a few seconds)
    const maxAttempts = 20 // 20 attempts * 2 seconds = 40 seconds max wait
    let attempts = 0
    
    while (attempts < maxAttempts) {
      attempts++
      
      // Wait before polling (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log(`[VirusTotal] Polling for results (attempt ${attempts}/${maxAttempts})`)
      
      const analysisResponse = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          method: 'GET',
          headers: {
            'x-apikey': apiKey,
          },
        }
      )

      if (!analysisResponse.ok) {
        console.error('[VirusTotal] Analysis check failed:', analysisResponse.status)
        continue
      }

      const analysisData = await analysisResponse.json()
      const status = analysisData.data?.attributes?.status

      if (status === 'completed') {
        const stats = analysisData.data?.attributes?.stats
        const results = analysisData.data?.attributes?.results
        
        const malicious = stats?.malicious || 0
        const suspicious = stats?.suspicious || 0
        const undetected = stats?.undetected || 0
        const harmless = stats?.harmless || 0
        const total = malicious + suspicious + undetected + harmless

        const isSafe = malicious === 0 && suspicious === 0

        console.log(`[VirusTotal] Scan complete: ${malicious} malicious, ${suspicious} suspicious, ${undetected} undetected, ${harmless} harmless`)

        return {
          safe: isSafe,
          malicious,
          suspicious,
          undetected,
          harmless,
          total,
          scanId: analysisId,
          permalink: `https://www.virustotal.com/gui/file-analysis/${analysisId}`,
          engines: results
        }
      } else if (status === 'queued' || status === 'in-progress') {
        // Continue polling
        continue
      } else {
        console.error('[VirusTotal] Unexpected status:', status)
        return { error: `Unexpected scan status: ${status}` }
      }
    }

    // Timeout - scan took too long
    console.error('[VirusTotal] Scan timeout after 40 seconds')
    return { 
      error: 'Scan timeout - file is still being analyzed',
      details: 'The scan is taking longer than expected. Please try again later.'
    }

  } catch (error: any) {
    console.error('[VirusTotal] Scan error:', error)
    return {
      error: 'Failed to scan file',
      details: error.message
    }
  }
}

/**
 * Scan a file by its SHA256 hash (faster, no upload needed if file was scanned before)
 * @param sha256 - SHA256 hash of the file
 * @returns Scan result or error
 */
export async function scanByHash(sha256: string): Promise<VirusTotalScanResult | VirusTotalError> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY

  if (!apiKey) {
    return { 
      error: 'VirusTotal API key not configured',
      details: 'VIRUSTOTAL_API_KEY environment variable is missing'
    }
  }

  try {
    const response = await fetch(
      `https://www.virustotal.com/api/v3/files/${sha256}`,
      {
        method: 'GET',
        headers: {
          'x-apikey': apiKey,
        },
      }
    )

    if (response.status === 404) {
      // File not found in VirusTotal database
      return { error: 'File not found in VirusTotal database' }
    }

    if (!response.ok) {
      const errorText = await response.text()
      return {
        error: `VirusTotal lookup failed: ${response.status}`,
        details: errorText
      }
    }

    const data = await response.json()
    const stats = data.data?.attributes?.last_analysis_stats
    const results = data.data?.attributes?.last_analysis_results

    const malicious = stats?.malicious || 0
    const suspicious = stats?.suspicious || 0
    const undetected = stats?.undetected || 0
    const harmless = stats?.harmless || 0
    const total = malicious + suspicious + undetected + harmless

    const isSafe = malicious === 0 && suspicious === 0

    return {
      safe: isSafe,
      malicious,
      suspicious,
      undetected,
      harmless,
      total,
      permalink: `https://www.virustotal.com/gui/file/${sha256}`,
      engines: results
    }

  } catch (error: any) {
    console.error('[VirusTotal] Hash lookup error:', error)
    return {
      error: 'Failed to lookup file hash',
      details: error.message
    }
  }
}

/**
 * Check if VirusTotal is properly configured
 */
export function isVirusTotalConfigured(): boolean {
  return !!process.env.VIRUSTOTAL_API_KEY
}
