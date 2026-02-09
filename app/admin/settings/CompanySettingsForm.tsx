'use client'

import { useState } from 'react'
import { updateCompanySettings, uploadCompanyLogo } from '@/app/actions/company-settings'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface CompanySettingsFormProps {
  tenant: {
    id: string
    company_name: string
    subdomain: string
    logo_url: string | null
    primary_color: string
    secondary_color: string
    auto_rename_files: boolean
    virus_scan_enabled: boolean
    timezone: string
  }
}

export default function CompanySettingsForm({ tenant }: CompanySettingsFormProps) {
  const [companyName, setCompanyName] = useState(tenant.company_name)
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url)
  const [primaryColor, setPrimaryColor] = useState(tenant.primary_color)
  const [secondaryColor, setSecondaryColor] = useState(tenant.secondary_color)
  const [autoRenameFiles, setAutoRenameFiles] = useState(tenant.auto_rename_files)
  const [virusScanEnabled, setVirusScanEnabled] = useState(tenant.virus_scan_enabled)
  const [timezone, setTimezone] = useState(tenant.timezone || 'America/Los_Angeles')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - only PNG, JPG, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid File Type', {
        description: 'Please select a PNG, JPG, or SVG image file'
      })
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', {
        description: 'Logo must be smaller than 5MB'
      })
      return
    }

    setLogoFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return

    setIsUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append('logo', logoFile)

      const result = await uploadCompanyLogo(formData)

      if (result.success && result.logoUrl) {
        setLogoUrl(result.logoUrl)
        setLogoPreview(result.logoUrl)
        setLogoFile(null)
        
        toast.success('Logo Uploaded', {
          description: 'Company logo has been uploaded successfully'
        })
      } else {
        toast.error('Upload Failed', {
          description: result.error || 'Failed to upload logo'
        })
      }
    } catch (error) {
      toast.error('Upload Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateCompanySettings({
        company_name: companyName,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        auto_rename_files: autoRenameFiles,
        virus_scan_enabled: virusScanEnabled,
        timezone: timezone,
      })

      if (result.success) {
        toast.success('Settings Updated', {
          description: 'Company settings have been saved successfully'
        })
        
        // Reload page to apply new theme
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast.error('Update Failed', {
          description: result.error || 'Failed to update settings'
        })
      }
    } catch (error) {
      toast.error('Update Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Name */}
      <div>
        <Label htmlFor="company_name">Company Name</Label>
        <Input
          id="company_name"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          This name appears on the landing page and dashboard
        </p>
      </div>

      {/* Subdomain (Read-only) */}
      <div>
        <Label htmlFor="subdomain">Subdomain</Label>
        <Input
          id="subdomain"
          type="text"
          value={tenant.subdomain}
          disabled
          className="bg-gray-100"
        />
        <p className="text-sm text-gray-500 mt-1">
          Subdomain cannot be changed. Contact support if needed.
        </p>
      </div>

      {/* Timezone */}
      <div>
        <Label htmlFor="timezone">Company Timezone</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <optgroup label="United States">
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
          </optgroup>
          <optgroup label="Canada">
            <option value="America/Toronto">Toronto (ET)</option>
            <option value="America/Vancouver">Vancouver (PT)</option>
            <option value="America/Edmonton">Edmonton (MT)</option>
          </optgroup>
          <optgroup label="Europe">
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Europe/Paris">Paris (CET/CEST)</option>
            <option value="Europe/Berlin">Berlin (CET/CEST)</option>
            <option value="Europe/Rome">Rome (CET/CEST)</option>
            <option value="Europe/Madrid">Madrid (CET/CEST)</option>
            <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
          </optgroup>
          <optgroup label="Asia">
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
            <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
            <option value="Asia/Dubai">Dubai (GST)</option>
            <option value="Asia/Kolkata">India (IST)</option>
          </optgroup>
          <optgroup label="Australia">
            <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
            <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
            <option value="Australia/Brisbane">Brisbane (AEST)</option>
            <option value="Australia/Perth">Perth (AWST)</option>
          </optgroup>
          <optgroup label="Other">
            <option value="UTC">UTC (Coordinated Universal Time)</option>
          </optgroup>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Used for time-based greetings (Good morning, Good afternoon, Good evening)
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <Label>Company Logo</Label>
        <div className="mt-2 space-y-4">
          {/* Logo Preview */}
          {logoPreview && (
            <div className="relative w-48 h-48 border-2 border-gray-200 rounded-lg p-4 bg-white">
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative w-full h-full">
                <Image
                  src={logoPreview}
                  alt="Company logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* File Input */}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoFileChange}
              className="flex-1"
            />
            {logoFile && (
              <Button
                type="button"
                onClick={handleUploadLogo}
                disabled={isUploadingLogo}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploadingLogo ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Upload your company logo (PNG, JPG, or SVG - max 5MB). Logo appears next to Baseline Docs branding.
          </p>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="primary_color">Primary Brand Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="primary_color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#2E7DB5"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Used for buttons, links, and accents
          </p>
        </div>

        <div>
          <Label htmlFor="secondary_color">Secondary Brand Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="secondary_color"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#1E3A5F"
              className="flex-1"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Used for headers and backgrounds
          </p>
        </div>
      </div>

      {/* Auto-Rename Files */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <Label htmlFor="auto_rename_files" className="text-base font-medium">
            Auto-Rename Uploaded Files
          </Label>
          <p className="text-sm text-gray-500 mt-1">
            Automatically prefix uploaded files with document number and version
            (e.g., "FORM-00001vA_UserSurvey.pdf")
          </p>
        </div>
        <Switch
          id="auto_rename_files"
          checked={autoRenameFiles}
          onCheckedChange={setAutoRenameFiles}
        />
      </div>

      {/* Virus Scanning */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-yellow-200">
        <div className="flex-1">
          <Label htmlFor="virus_scan_enabled" className="text-base font-medium">
            Enable Virus Scanning (TotalVirus)
          </Label>
          <p className="text-sm text-gray-500 mt-1">
            Scan uploaded files for viruses and malware using TotalVirus API
          </p>
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="font-medium mb-1">⚠️ Privacy Notice:</p>
            <p>When enabled, file hashes are sent to TotalVirus (a third-party service) for scanning. 
            TotalVirus may share threat data with security researchers and other organizations. 
            Disable this if you handle highly sensitive or confidential documents.</p>
          </div>
          {!virusScanEnabled && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              ⚠️ When disabled, all uploaded files will be marked as "safe" without scanning.
            </p>
          )}
        </div>
        <Switch
          id="virus_scan_enabled"
          checked={virusScanEnabled}
          onCheckedChange={setVirusScanEnabled}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}
