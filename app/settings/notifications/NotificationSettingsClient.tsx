'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Mail, Bell, AlertCircle, CheckCircle, FileText } from 'lucide-react'

interface NotificationPreferences {
  approval_requested: boolean
  approval_completed: boolean
  document_rejected: boolean
  document_released: boolean
  delivery_mode: 'immediate' | 'digest'
  digest_time: string
}

interface Props {
  preferences: NotificationPreferences
}

export default function NotificationSettingsClient({ preferences }: Props) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences)

  const handleToggle = (key: keyof Omit<NotificationPreferences, 'delivery_mode' | 'digest_time'>) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleDeliveryModeChange = (mode: 'immediate' | 'digest') => {
    setPrefs(prev => ({
      ...prev,
      delivery_mode: mode
    }))
  }

  const handleDigestTimeChange = (time: string) => {
    setPrefs(prev => ({
      ...prev,
      digest_time: time
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Notification preferences saved')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const notificationTypes = [
    {
      key: 'approval_requested' as const,
      icon: Bell,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      title: 'Approval Requests',
      description: 'When you\'re assigned to approve a document',
      critical: true,
    },
    {
      key: 'approval_completed' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      title: 'Document Approved',
      description: 'When your document is approved by all reviewers',
      critical: false,
    },
    {
      key: 'document_rejected' as const,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      title: 'Document Rejected',
      description: 'When your document is rejected and returned to draft',
      critical: true,
    },
    {
      key: 'document_released' as const,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      title: 'Document Released',
      description: 'When your document is released and available to users',
      critical: false,
    },
  ]

  const timeOptions = [
    { value: '06:00:00', label: '6:00 AM' },
    { value: '07:00:00', label: '7:00 AM' },
    { value: '08:00:00', label: '8:00 AM' },
    { value: '09:00:00', label: '9:00 AM' },
    { value: '10:00:00', label: '10:00 AM' },
    { value: '12:00:00', label: '12:00 PM' },
    { value: '17:00:00', label: '5:00 PM' },
    { value: '18:00:00', label: '6:00 PM' },
  ]

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                <strong>Approval requests and rejections</strong> are always sent immediately. 
                Other notifications respect your delivery mode preference.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Mode Section */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Mode</CardTitle>
          <CardDescription>Choose when to receive email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="immediate"
                name="delivery_mode"
                value="immediate"
                checked={prefs.delivery_mode === 'immediate'}
                onChange={() => handleDeliveryModeChange('immediate')}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="immediate" className="text-base font-semibold cursor-pointer">
                  Immediate
                </Label>
                <p className="text-sm text-gray-600">Receive emails instantly when events occur</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="digest"
                name="delivery_mode"
                value="digest"
                checked={prefs.delivery_mode === 'digest'}
                onChange={() => handleDeliveryModeChange('digest')}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="digest" className="text-base font-semibold cursor-pointer">
                  Daily Digest
                </Label>
                <p className="text-sm text-gray-600">Receive a summary once per day at your chosen time</p>
              </div>
            </div>
          </div>

          {prefs.delivery_mode === 'digest' && (
            <div className="pl-7 pt-2">
              <Label htmlFor="digest-time" className="text-sm font-medium">Digest Time</Label>
              <select
                id="digest-time"
                value={prefs.digest_time}
                onChange={(e) => handleDigestTimeChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Control which email notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map((type) => {
              const Icon = type.icon
              const enabled = prefs[type.key]

              return (
                <div
                  key={type.key}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors ${
                    enabled 
                      ? `${type.bgColor} border-transparent` 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label 
                        htmlFor={type.key}
                        className="text-base font-semibold text-gray-900 cursor-pointer"
                      >
                        {type.title}
                      </Label>
                      {type.critical && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {type.description}
                    </p>
                  </div>

                  <Switch
                    id={type.key}
                    checked={enabled}
                    onCheckedChange={() => handleToggle(type.key)}
                    className="flex-shrink-0"
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm text-gray-900 mb-2">
            About Email Notifications
          </h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Approval requests and rejections are always sent immediately</li>
            <li>Important notifications ensure critical workflow steps aren't missed</li>
            <li>You can change these settings at any time</li>
            <li>All emails include a link to unsubscribe or manage preferences</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
