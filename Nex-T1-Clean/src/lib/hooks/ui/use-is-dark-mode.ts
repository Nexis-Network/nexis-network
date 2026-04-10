"use client"

import { useEffect, useState } from "react"

export function useIsDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === "undefined") {
      return false
    }
    return document.documentElement.classList.contains("dark")
  })

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    const root = document.documentElement
    const update = () => {
      setIsDarkMode(root.classList.contains("dark"))
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => {
      observer.disconnect()
    }
  }, [])

  return isDarkMode
}
