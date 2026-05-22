import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          red: '#E31837',
          'red-dark': '#A50F28',
          'red-light': '#FFF0F2',
          orange: '#FF6B35',
          'orange-dark': '#D44F1A',
          green: '#27AE60',
          dark: '#1A0A0C',
        },
      },
    },
  },
  plugins: [],
}
export default config
