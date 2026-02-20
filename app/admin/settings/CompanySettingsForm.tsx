'use client'

import { useState } from 'react'
import { updateCompanySettings, uploadCompanyLogo } from '@/app/actions/company-settings'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Building2, Palette, Settings } from 'lucide-react'
import Image from 'next/image'

interface CompanySettingsFormProps {
  tenant: {
    id: string
    company_name: string
    subdomain: string
    logo_url: string | null
    primary_color: string
    secondary_color: string
    background_start_color: string
    background_end_color: string
    auto_rename_files: boolean
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
  const [backgroundStartColor, setBackgroundStartColor] = useState(tenant.background_start_color || '#F8FAFC')
  const [backgroundEndColor, setBackgroundEndColor] = useState(tenant.background_end_color || '#E2E8F0')
  const [autoRenameFiles, setAutoRenameFiles] = useState(tenant.auto_rename_files)  const [timezone, setTimezone] = useState(tenant.timezone || 'America/Los_Angeles')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - only PNG, JPG, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid File Type', {
        description: 'Only PNG, JPG, and SVG files are allowed'
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
      formData.append('tenantId', tenant.id)

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
      console.error('Upload error:', error)
      toast.error('Upload Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateCompanySettings({
        tenantId: tenant.id,
        company_name: companyName,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_start_color: backgroundStartColor,
        background_end_color: backgroundEndColor,
        auto_rename_files: autoRenameFiles,        timezone: timezone,
      })

      if (result.success) {
        toast.success('Settings Updated', {
          description: 'Company settings have been saved successfully'
        })
        
        // Refresh the page to apply new theme
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast.error('Update Failed', {
          description: result.error || 'Failed to update settings'
        })
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Update Failed', {
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {/* Company Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <CardTitle>Company Information</CardTitle>
          </div>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Name & Subdomain in 2 columns */}
          <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                type="text"
                value={tenant.subdomain}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label htmlFor="timezone">Timezone</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Branding Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-500" />
            <CardTitle>Branding & Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize your organization's visual identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div>
            <Label>Company Logo</Label>
            <div className="mt-2 flex items-start gap-4">
              {/* Logo Preview */}
              {logoPreview && (
                <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg p-2 bg-white flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null)
                      setLogoFile(null)
                      setLogoUrl('')
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
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

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="cursor-pointer"
                />
                {logoFile && (
                  <Button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={isUploadingLogo}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  PNG, JPG, or SVG. Max 5MB. Square format recommended.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Colors - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  id="primary_color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#2E7DB5"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  id="secondary_color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#1E3A5F"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Background Gradient - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="background_start_color">Background Start</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  id="background_start_color"
                  type="color"
                  value={backgroundStartColor}
                  onChange={(e) => setBackgroundStartColor(e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={backgroundStartColor}
                  onChange={(e) => setBackgroundStartColor(e.target.value)}
                  placeholder="#F8FAFC"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="background_end_color">Background End</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  id="background_end_color"
                  type="color"
                  value={backgroundEndColor}
                  onChange={(e) => setBackgroundEndColor(e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={backgroundEndColor}
                  onChange={(e) => setBackgroundEndColor(e.target.value)}
                  placeholder="#E2E8F0"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Background Preview */}
          <div>
            <Label className="text-sm text-gray-600">Gradient Preview</Label>
            <div 
              className="h-24 rounded-lg border-2 border-gray-300 mt-1"
              style={{
                background: `linear-gradient(to bottom right, ${backgroundStartColor}, ${backgroundEndColor})`
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <CardTitle>Features & Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure system behavior and features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-Rename Files - Compact Row */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 pr-4">
              <div className="font-medium text-sm">Auto-Rename Files</div>
              <p className="text-xs text-gray-500 mt-1">
                Prefix uploaded files with document number (e.g., "FORM-00001vA_Survey.pdf")
              </p>
            </div>
            <Switch
              checked={autoRenameFiles}
              onCheckedChange={setAutoRenameFiles}
            />
          </div>

          {/* Virus Scanning - Compact Row */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 pr-4">
              <div className="font-medium text-sm">Virus Scanning</div>
              <p className="text-xs text-gray-500 mt-1">
                Scan uploaded files for malware and security threats
              </p>
              {!virusScanEnabled && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠️ Scanning disabled - files will not be checked for threats
                </div>
              )}
            </div>
            <Switch
              checked={virusScanEnabled}
              onCheckedChange={setVirusScanEnabled}
            />
          </div>

          {virusScanEnabled && (
            <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
              Do not upload files containing sensitive or confidential information.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          size="lg"
        >
          {isSubmitting ? 'Saving...' : 'Update Settings'}
        </Button>
      </div>
    </form>
  )
}
