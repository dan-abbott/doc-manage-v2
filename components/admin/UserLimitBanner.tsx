/**
 * User Limit Banner - Shows usage and upgrade prompts
 * components/admin/UserLimitBanner.tsx
 */

'use client'

import { AlertCircle, Users, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface UserLimitBannerProps {
  currentUsers: number
  userLimit: number
  plan: string
}

export default function UserLimitBanner({ currentUsers, userLimit, plan }: UserLimitBannerProps) {
  const percentUsed = (currentUsers / userLimit) * 100
  const isAtLimit = currentUsers >= userLimit
  const isNearLimit = percentUsed >= 80 && !isAtLimit

  // Don't show banner if plenty of space (< 80% used)
  if (!isNearLimit && !isAtLimit) {
    return null
  }

  const planNames: Record<string, string> = {
    trial: 'Trial',
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise'
  }

  const planName = planNames[plan] || plan

  return (
    <div className={`rounded-lg p-4 mb-6 ${
      isAtLimit 
        ? 'bg-red-50 border-2 border-red-200' 
        : 'bg-amber-50 border-2 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`rounded-full p-2 ${
          isAtLimit ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          {isAtLimit ? (
            <AlertCircle className={`h-5 w-5 ${
              isAtLimit ? 'text-red-600' : 'text-amber-600'
            }`} />
          ) : (
            <Users className="h-5 w-5 text-amber-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {isAtLimit ? (
            // At limit - can't add more users
            <>
              <h3 className="font-semibold text-red-900 mb-1">
                User Limit Reached
              </h3>
              <p className="text-sm text-red-800 mb-3">
                You've used all <strong>{userLimit} user seats</strong> included in your {planName} plan. 
                Upgrade now to add more team members.
              </p>
              <Link 
                href="/admin/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Upgrade Plan
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            // Near limit - warning
            <>
              <h3 className="font-semibold text-amber-900 mb-1">
                Running Low on User Seats
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                You're using <strong>{currentUsers} of {userLimit} user seats</strong> on your {planName} plan. 
                Consider upgrading to ensure you have room for your growing team.
              </p>
              <Link 
                href="/admin/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                View Plans
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          )}

          {/* Usage bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>User Seats</span>
              <span>{currentUsers} / {userLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isAtLimit 
                    ? 'bg-red-500' 
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
