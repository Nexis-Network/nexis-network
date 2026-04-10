'use client'

import type { CSSProperties } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { resolveAppThemeMode } from '@/lib/theme/app-theme'
import { cn } from '@/lib/utils'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, resolvedTheme } = useTheme()
  const isDark =
    resolveAppThemeMode(theme, resolvedTheme) === 'dark'
  const toastSurfaceClassName = isDark
    ? 'border-[rgba(120,120,128,0.2)] before:bg-[linear-gradient(0deg,#1F1F1F,#1F1F1F),rgba(130,130,130,0.8)] before:bg-blend-overlay'
    : 'border-[rgba(120,120,128,0.16)] before:bg-[linear-gradient(0deg,#262626,#262626),rgba(255,255,255,0.8)] before:bg-blend-color-dodge'
  const titleClassName = isDark ? 'text-white' : 'text-[#101012]'
  const descriptionClassName = isDark
    ? 'text-[rgba(176,176,185,0.72)]'
    : 'text-[rgba(60,60,67,0.72)]'
  const iconClassName = isDark
    ? 'text-[rgba(176,176,185,0.72)]'
    : 'text-[rgba(60,60,67,0.72)]'

  return (
    <Sonner
      theme={resolveAppThemeMode(theme, resolvedTheme) as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'transparent',
          '--normal-text': 'transparent',
          '--normal-border': 'transparent',
        } as CSSProperties
      }
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            'group relative flex w-[450px] max-w-[min(450px,calc(100vw-24px))] items-start gap-6 overflow-hidden rounded-[24px] border bg-transparent p-4 shadow-none backdrop-blur-[64px]',
            'before:absolute before:inset-0 before:-z-10 before:rounded-[24px] before:content-[""]',
            toastSurfaceClassName,
          ),
          content: 'flex min-w-0 flex-1 flex-col gap-0 pl-1',
          title: cn('text-base font-medium leading-6 tracking-normal', titleClassName),
          description: cn(
            'text-base font-normal leading-6 tracking-[-0.25px]',
            descriptionClassName,
          ),
          icon: cn('mt-0.5 shrink-0', iconClassName),
          closeButton: cn(
            'absolute right-4 top-4 flex size-6 items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none',
            iconClassName,
          ),
          success: iconClassName,
          error: iconClassName,
          info: iconClassName,
          warning: iconClassName,
          loading: iconClassName,
          default: iconClassName,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
