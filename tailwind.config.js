/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── shadcn/ui component tokens (preserved) ──────────────────────
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // ── ClearStride brand tokens — use these in new components ──────
        // Usage: bg-brand-slate, text-brand-blue, border-brand-amber, etc.
        brand: {
          // Core shared palette
          'dark-slate': '#1E293B',  // 70–80% of UI chrome
          'slate':      '#475569',  // secondary text / borders
          'light-slate':'#9AA3B8',  // muted / disabled
          'off-white':  '#F8FAFC',  // page background

          // Accent — use at 3–8% only
          'amber':      '#D97706',  // brand / active / progress
          'amber-dark': '#F59E0B',  // dark mode brightened

          // BaselineDocs product accent
          'blue':       '#2563EB',  // primary actions / links / selected
          'blue-dark':  '#3B82F6',  // dark mode brightened

          // Semantic
          'success':    '#16A34A',
          'error':      '#DC2626',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
        mono: ['Courier New', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'brand-card':  '0 1px 3px rgba(0,0,0,.12)',
        'brand-modal': '0 8px 32px rgba(0,0,0,.24)',
      },
      transitionDuration: {
        'brand': '150ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
