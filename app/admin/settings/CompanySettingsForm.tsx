'use client'

import { useState } from 'react'
import { updateCompanySettings } from '@/app/actions/company-settings'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CompanySettingsFormProps {
  tenant: {
    id: string
    company_name: string
    subdomain: string
    logo_url: string | null
    primary_color: string
    secondary_color: string
    auto_rename_files: boolean
  }
}

export default function CompanySettingsForm({ tenant }: CompanySettingsFormProps) {
  const [companyName, setCompanyName] = useState(tenant.company_name)
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '')
  const [primaryColor, setPrimaryColor] = useState(tenant.primary_color)
  const [secondaryColor, setSecondaryColor] = useState(tenant.secondary_color)
  const [autoRenameFiles, setAutoRenameFiles] = useState(tenant.auto_rename_files)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      })

      if (result.success) {
        toast.success('Settings Updated', {
          description: 'Company settings have been saved successfully'
        })
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

      {/* Logo URL */}
      <div>
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input
          id="logo_url"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        <p className="text-sm text-gray-500 mt-1">
          URL to your company logo (optional). Future: File upload coming soon.
        </p>
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
