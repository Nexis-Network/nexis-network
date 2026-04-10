"use client"

import DottedMap from "dotted-map"
import { useTheme } from "next-themes"
import { useMemo } from "react"

export default function WorldMap({ className }: { className?: string }) {
  const { theme = "dark" } = useTheme()

  const mapSvg = useMemo(() => {
    const map = new DottedMap({ height: 60, grid: "diagonal" })

    // Add pins for major hubs (Example: NY, London, Singapore, Tokyo)
    map.addPin({
      lat: 40.7128,
      lng: -74.006,
      svgOptions: { color: theme === "dark" ? "#FFFFFF" : "#000000", radius: 0.4 },
    })
    
    map.addPin({
      lat: 51.5074,
      lng: -0.1278,
      svgOptions: { color: theme === "dark" ? "#FFFFFF" : "#000000", radius: 0.4 },
    })

    const svg = map.getSVG({
      radius: 0.22,
      color: theme === "dark" ? "#4B5563" : "#9CA3AF", 
      shape: "circle",
      backgroundColor: "transparent",
    })

    return svg
  }, [theme])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: mapSvg }}
    />
  )
}