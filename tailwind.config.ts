import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B1020',
        surface: '#111827',
        card: '#1E293B',
        primary: '#6366F1',
        cyan: '#22D3EE',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: '#E5EEF8',
        muted: '#94A3B8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        shell: '0 24px 80px rgba(8, 15, 33, 0.55)',
        glow: '0 0 40px rgba(99, 102, 241, 0.25)',
        cyan: '0 0 30px rgba(34, 211, 238, 0.2)',
      },
      backgroundImage: {
        'shell-grid':
          'radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.12), transparent 28%)',
      },
    },
  },
  plugins: [],
} satisfies Config
