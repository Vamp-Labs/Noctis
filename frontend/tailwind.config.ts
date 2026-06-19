import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B21A8',
          hover: '#581C87',
          light: '#7C3AED',
        },
        secondary: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
        },
        background: '#0F0A1A',
        surface: '#1A1030',
        'surface-light': '#231845',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        input: '8px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

export default config
