export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '28rem',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Error Code */}
        <h1 style={{
          fontSize: '6rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          404
        </h1>

        {/* Title */}
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Page Not Found
        </h2>

        {/* Description */}
        <p style={{
          color: '#6b7280',
          marginBottom: '2rem'
        }}>
          Sorry, we couldn't find the page you're looking for. The document or page may have been moved or deleted.
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center'
        }}>
          <a
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Go to Dashboard
          </a>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '2rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <p>Need help? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  )
}
