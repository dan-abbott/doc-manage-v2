import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        {/* BaselineDocs Logo */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 400"
          width="32"
          height="32"
        >
          <rect x="100" y="80" width="200" height="240" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
          <path d="M 300 80 L 300 120 L 260 120 Z" fill="#2E7DB5"/>
          <path d="M 260 120 L 300 120 L 300 80" fill="none" stroke="#2E7DB5" strokeWidth="8" strokeLinejoin="miter"/>
          <rect x="130" y="130" width="90" height="8" rx="4" fill="#2E7DB5"/>
          <rect x="130" y="160" width="140" height="8" rx="4" fill="#2E7DB5"/>
          <rect x="130" y="190" width="140" height="8" rx="4" fill="#6B7280"/>
          <rect x="130" y="220" width="90" height="8" rx="4" fill="#6B7280"/>
          <rect x="80" y="240" width="240" height="12" rx="6" fill="#1E3A5F"/>
          <path d="M 200 250 L 190 280 L 200 290 L 210 280 Z" fill="#2E7DB5"/>
          <rect x="110" y="280" width="180" height="40" rx="8" fill="none" stroke="#2E7DB5" strokeWidth="8"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}
