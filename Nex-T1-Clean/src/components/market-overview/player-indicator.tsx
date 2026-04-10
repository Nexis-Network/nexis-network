"use client"

import { useEffect, useState } from "react"

import { updatePlayerHeartbeat } from "@/server/actions/pong-actions"
import { digits, Matrix, type Frame } from "@/components/ui/matrix"


import { logger } from '@/lib/logger';
const HEARTBEAT_INTERVAL_MS = 5000
const PULSE_INTERVAL_MS = 1000
const PLAYER_COUNT_DIGITS = 4

/**
 * PlayerIndicator displays a live count of active players
 * with a pulsing dot indicator and matrix-style digit display.
 *
 * @remarks
 * Uses Upstash Redis via server actions to track active players.
 * Each player sends a heartbeat every 5 seconds.
 */
export function PlayerIndicator() {
  const [userCount, setUserCount] = useState<number>(1)
  const [pulse, setPulse] = useState<number>(1)
  const [playerId] = useState<string>(() =>
    Math.random().toString(36).substring(7)
  )

  useEffect(() => {
    // Pulse animation for the live indicator dot
    const pulseInterval = setInterval(() => {
      setPulse((prev) => (prev === 1 ? 0.5 : 1))
    }, PULSE_INTERVAL_MS)

    // Heartbeat to track active players via server action
    const sendHeartbeat = async () => {
      try {
        const count = await updatePlayerHeartbeat(playerId)
        setUserCount(count)
      } catch (error) {
        logger.error("Failed to send heartbeat:", error)
      }
    }

    // Send initial heartbeat immediately
    void sendHeartbeat()
    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(pulseInterval)
      clearInterval(heartbeatInterval)
    }
  }, [playerId])

  // Single pixel pulse indicator
  const pulsePattern: Frame = [[pulse]]

  // Convert count to array of digits with leading zeros (e.g., 0042)
  const countDigits: number[] = userCount
    .toString()
    .padStart(PLAYER_COUNT_DIGITS, "0")
    .split("")
    .map(Number)

  return (
    <div className="flex items-center gap-1.5">
      <Matrix
        rows={1}
        cols={1}
        pattern={pulsePattern}
        size={4}
        gap={0}
        ariaLabel="Live indicator"
      />
      <div className="flex items-center gap-0.5">
        {countDigits.map((digit, index) => (
          <Matrix
            key={index}
            rows={7}
            cols={5}
            pattern={digits[digit]}
            size={3}
            gap={0.5}
            ariaLabel={`Player count digit ${digit}`}
          />
        ))}
        <span className="text-muted-foreground ml-1 font-mono text-[8px] tracking-wider uppercase">
          playing
        </span>
      </div>
    </div>
  )
}
