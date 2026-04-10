import localFont from 'next/font/local'

export const inter = localFont({
  src: '../app/fonts/InterVariableLatin.woff2',
  variable: "--font-inter",
  weight: '100 900',
  style: 'normal',
  display: "swap",
  preload: false,
})

export const geistSans = localFont({
  src: '../app/fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
})

export const geistMono = localFont({
  src: '../app/fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
})

export const funnelDisplay = localFont({
  src: '../app/fonts/InterVariableLatin.woff2',
  variable: '--font-funnel-display',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
})

export const fontVariablesClassName = [
  inter.variable,
  geistSans.variable,
  geistMono.variable,
  funnelDisplay.variable,
].join(' ')
