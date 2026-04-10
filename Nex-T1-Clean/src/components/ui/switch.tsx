'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

type SwitchSize = 'xs' | 'sm' | 'md'

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: SwitchSize
}

const SWITCH_SIZE_STYLES: Record<SwitchSize, React.CSSProperties> = {
  xs: {
    '--switch-width': '44px',
    '--switch-height': '20px',
    '--switch-padding': '2px',
    '--switch-thumb-width': '26px',
    '--switch-thumb-height': '16px',
    '--switch-indicator-width': '1px',
    '--switch-indicator-height': '7px',
    '--switch-indicator-shift': '26px',
    '--switch-lane-width': '14px',
    '--switch-track-on-bg': '#3891ff',
    '--switch-track-off-bg': 'var(--muted)',
    '--switch-border-color': 'var(--border)',
    '--switch-track-highlight': 'color-mix(in oklab, var(--foreground) 12%, transparent)',
    '--switch-indicator-bg': 'var(--primary-foreground)',
  } as React.CSSProperties,
  sm: {
    '--switch-width': '52px',
    '--switch-height': '24px',
    '--switch-padding': '2px',
    '--switch-thumb-width': '31px',
    '--switch-thumb-height': '20px',
    '--switch-indicator-width': '1px',
    '--switch-indicator-height': '8px',
    '--switch-indicator-shift': '31px',
    '--switch-lane-width': '17px',
    '--switch-track-on-bg': '#3891ff',
    '--switch-track-off-bg': 'var(--muted)',
    '--switch-border-color': 'var(--border)',
    '--switch-track-highlight': 'color-mix(in oklab, var(--foreground) 12%, transparent)',
    '--switch-indicator-bg': 'var(--primary-foreground)',
  } as React.CSSProperties,
  md: {
    '--switch-width': '64px',
    '--switch-height': '28px',
    '--switch-padding': '2px',
    '--switch-thumb-width': '39px',
    '--switch-thumb-height': '24px',
    '--switch-indicator-width': '1px',
    '--switch-indicator-height': '10px',
    '--switch-indicator-shift': '39px',
    '--switch-lane-width': '21px',
    '--switch-track-on-bg': '#3891ff',
    '--switch-track-off-bg': 'var(--muted)',
    '--switch-border-color': 'var(--border)',
    '--switch-track-highlight': 'color-mix(in oklab, var(--foreground) 12%, transparent)',
    '--switch-indicator-bg': 'var(--primary-foreground)',
  } as React.CSSProperties,
}

function Switch({
  className,
  size = 'sm',
  style,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'group/switch peer relative inline-flex h-[var(--switch-height)] w-[var(--switch-width)] shrink-0 items-center rounded-full border border-[var(--switch-border-color,var(--border))] p-[var(--switch-padding)] shadow-[inset_0_1px_0_var(--switch-track-highlight)] outline-none transition-[background-color,box-shadow,transform] duration-200 ease-out data-[state=checked]:bg-[var(--switch-track-on-bg)] data-[state=unchecked]:bg-[var(--switch-track-off-bg)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ ...SWITCH_SIZE_STYLES[size], ...style }}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="switch-indicator"
        className="pointer-events-none absolute left-[calc(var(--switch-padding)+((var(--switch-lane-width)-var(--switch-indicator-width))/2))] top-1/2 h-[var(--switch-indicator-height)] w-[var(--switch-indicator-width)] -translate-y-1/2 rounded-full bg-[var(--switch-indicator-bg)] transition-transform duration-200 ease-out group-data-[state=checked]/switch:translate-x-0 group-data-[state=unchecked]/switch:translate-x-[var(--switch-indicator-shift)]"
      />
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute left-[var(--switch-padding)] top-1/2 block h-[var(--switch-thumb-height)] w-[var(--switch-thumb-width)] -translate-y-1/2 rounded-full border border-border bg-popover shadow-sm ring-0 transition-transform duration-200 ease-out group-data-[state=checked]/switch:translate-x-[var(--switch-lane-width)] group-data-[state=unchecked]/switch:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
