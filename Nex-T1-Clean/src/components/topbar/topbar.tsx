'use client'

import clsx from 'clsx'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'

import patternImage from './images/pattern.svg'
import { ChevronIcon } from './chevron-icon'

const COUNTDOWN_DURATION_MS = 48 * 60 * 60 * 1000

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hourLabel = hours.toString().padStart(2, '0')
  const minuteLabel = minutes.toString().padStart(2, '0')
  const secondLabel = seconds.toString().padStart(2, '0')

  return `${hourLabel}:${minuteLabel}:${secondLabel}`
}

export function Topbar() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_DURATION_MS)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const targetTime = Date.now() + COUNTDOWN_DURATION_MS

    const updateTime = () => {
      const remaining = Math.max(targetTime - Date.now(), 0)
      setTimeLeft(remaining)
    }

    updateTime()
    const intervalId = window.setInterval(updateTime, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const countdownLabel = useMemo(() => formatTime(timeLeft), [timeLeft])
  const isDarkTheme = mounted && resolvedTheme === 'dark'

  return (
    <div
      className={clsx(
        'safe-paddings relative z-50 flex h-9 w-full items-center justify-center gap-x-2.5 overflow-hidden px-4 py-2.5 leading-none transition-colors duration-200 dark:bg-[#0B0C0F] dark:hover:bg-[#131415]',
        isDarkTheme ? 'bg-[#0B0C0F] hover:bg-[#131415]' : 'bg-[#F5FBFD] hover:bg-[#f1fcff]'
      )}
      role="region"
      aria-label="Nex-T1 Alpha testing public launch countdown"
    >
      <span
        className={clsx(
          'relative z-50 truncate py-1 text-sm font-medium tracking-[-0.02em] dark:text-[#E4E5E7] sm:text-[13px]',
          isDarkTheme ? 'text-[#E4E5E7]' : 'text-[#242628]'
        )}
        aria-live="polite"
      >
        Nex-T1 Alpha testing public launch - {countdownLabel}
      </span>
      <span
        className={clsx(
          'absolute left-1/2 -z-20 h-[106px] w-[29px] origin-center -translate-y-1/2 rotate-[226deg] rounded-[100%] mix-blend-plus-lighter blur-lg dark:opacity-100 sm:left-[30%]',
          isDarkTheme
            ? 'top-1/2 translate-x-[-280px] bg-[linear-gradient(-19deg,#FFF_51%,rgba(255,255,255,0)_30.57%)] sm:translate-x-0'
            : '-top-2 z-40 -translate-x-60 bg-[linear-gradient(265.08deg,#FFFFFF_52.92%,rgba(255,255,255,0)_53.57%)] opacity-50 sm:translate-x-0'
        )}
      />
      <span
        className={clsx(
          'absolute left-1/2 top-1/2 -z-10 h-[188px] w-[60px] origin-center -translate-y-[43%] translate-x-[-290px] rotate-[226deg] rounded-[100%] bg-[linear-gradient(-45deg,_#6DC5D8_40.06%,_#6A77E8_48.11%)] mix-blend-plus-lighter blur-2xl dark:opacity-100 sm:left-[30%] sm:translate-x-0',
          !isDarkTheme && 'opacity-70'
        )}
      />
      {!isDarkTheme && (
        <span className="absolute left-1/2 top-1/2 z-0 h-[188px] w-[60px] origin-center -translate-y-[43%] translate-x-[-290px] rotate-[226deg] rounded-[100%] bg-[linear-gradient(-45deg,_#6DC5D8_40.06%,_#6A77E8_48.11%)] opacity-100 blur-2xl dark:hidden sm:left-[30%] sm:translate-x-0" />
      )}
      <Image
        className={clsx(
          'absolute left-1/2 top-0 z-10 -translate-x-[440px] [mask-image:linear-gradient(90deg,rgba(0,0,0,.1)_15%,black_70%,rgba(0,0,0,.1)_100%)] dark:opacity-100 sm:left-0 sm:translate-x-0',
          !isDarkTheme && 'opacity-80 mix-blend-overlay'
        )}
        src={patternImage}
        width={345}
        height={35}
        alt=""
        priority
        aria-hidden
      />
      {!isDarkTheme && (
        <span
          className="absolute inset-x-0 bottom-0 z-10 block h-px w-full bg-[#FAFAFA] bg-opacity-40 dark:hidden"
          aria-hidden
        />
      )}
      <span
        className={clsx(
          'absolute inset-x-0 bottom-0 z-10 block h-px w-full mix-blend-overlay dark:bg-white',
          isDarkTheme ? 'bg-white' : 'bg-[#0c0d0d]'
        )}
        aria-hidden
      />
      <ChevronIcon
        className={clsx(
          'relative z-50 origin-center -rotate-90 opacity-60 dark:text-white',
          isDarkTheme ? 'text-white' : 'text-[#0c0d0d]'
        )}
        aria-hidden
      />
    </div>
  )
}

export default Topbar
