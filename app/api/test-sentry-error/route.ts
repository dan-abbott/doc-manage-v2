import { NextResponse } from 'next/server'

export async function GET() {
  // This will trigger a server-side error
  throw new Error('Test Server-Side Sentry Error - ' + new Date().toISOString())
  
  return NextResponse.json({ message: 'This should never be reached' })
}
