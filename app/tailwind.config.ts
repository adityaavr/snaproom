import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // Semantic color system
        background: {
          primary: '#0a0a0a',    // Pure black for main backgrounds
          secondary: '#151515',   // Slightly lighter for cards/panels
          elevated: '#1a1a1a',    // For elevated elements
        },
        surface: {
          1: '#ffffff08',         // Subtle surface overlay (5% white)
          2: '#ffffff12',         // Light surface overlay (7% white)
          3: '#ffffff1a',         // Medium surface overlay (10% white)
          4: '#ffffff26',         // Strong surface overlay (15% white)
        },
        text: {
          primary: '#ffffff',     // High contrast text
          secondary: '#a3a3a3',   // Medium contrast text (neutral-400)
          tertiary: '#737373',    // Low contrast text (neutral-500)
          disabled: '#525252',    // Disabled text (neutral-600)
        },
        border: {
          subtle: '#ffffff12',    // Subtle borders (7% white)
          default: '#ffffff1a',   // Default borders (10% white)
          strong: '#ffffff26',    // Strong borders (15% white)
        },
        accent: {
          primary: '#3b82f6',     // Blue-500 for primary actions
          'primary-hover': '#2563eb', // Blue-600 for hover states
          secondary: '#6366f1',   // Indigo-500 for secondary actions
          'secondary-hover': '#4f46e5', // Indigo-600 for hover
          success: '#22c55e',     // Green-500 for success states
          warning: '#f59e0b',     // Amber-500 for warnings
          danger: '#ef4444',      // Red-500 for destructive actions
        },
        // Subtle indicators
        indicator: {
          online: '#22c55e',      // Green for active/online
          processing: '#f59e0b',  // Amber for processing
          offline: '#6b7280',     // Gray for inactive/offline
        }
      },
      spacing: {
        // Consistent 4px spacing scale
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '10': '2.5rem',     // 40px
        '12': '3rem',       // 48px
        '16': '4rem',       // 64px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
      },
      fontSize: {
        // Type scale based on 1.2 ratio
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px
      },
      borderRadius: {
        'sm': '0.25rem',    // 4px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
