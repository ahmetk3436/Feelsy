/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary brand colors (Rose/Red)
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        // 2025-2026 AI Gradient Haze colors
        gradient: {
          start: '#6366f1',  // Indigo
          middle: '#ec4899', // Pink
          end: '#f43f5e',   // Rose
        },
        // Dark mode colors (OLED-friendly)
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          850: '#18181b',  // Surface
          900: '#111827',  // Elevated surface
          950: '#030712',  // Background (OLED black)
        },
        // Semantic colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(244, 63, 94, 0.3)',
        'glow-md': '0 0 20px rgba(244, 63, 94, 0.4)',
        'glow-lg': '0 0 30px rgba(244, 63, 94, 0.5)',
        'colored': '0 4px 12px rgba(99, 102, 241, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 1s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { backgroundPosition: '-200% 0' },
          '50%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
