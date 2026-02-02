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
  delivery_mode: 'immediate' | 'digest'  // NEW
  digest_time: string  // NEW (e.g., "08:00:00")
}

interface Props {
  preferences: NotificationPreferences
}

export default function NotificationSettingsClient({ preferences }: Props) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences)

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
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

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                <strong>All emails are sent immediately</strong> when events occur. 
                You can disable non-critical notifications below.
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
        <CardContent>
          <RadioGroup value={prefs.delivery_mode} onValueChange={...}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="immediate" id="immediate" />
              <Label>Immediate - Receive emails instantly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="digest" id="digest" />
              <Label>Daily Digest - Receive a summary once per day</Label>
            </div>
          </RadioGroup>

          {prefs.delivery_mode === 'digest' && (
            <Select value={prefs.digest_time} onValueChange={...}>
              <option value="06:00:00">6:00 AM</option>
              <option value="07:00:00">7:00 AM</option>
              <option value="08:00:00">8:00 AM</option>
              ...
            </Select>
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
