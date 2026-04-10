"use client"

import { useEffect, useRef, useState } from "react"

import {
  GameEngine,
  type GameState,
} from "@/lib/game-engine"
import { PlayerIndicator } from "@/components/market-overview/player-indicator"
import { digits, Matrix, type Frame } from "@/components/ui/matrix"

export function PongGame() {
  const [gameState, setGameState] = useState<GameState>("title")
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAIScore] = useState(0)
  const [currentFrame, setCurrentFrame] = useState<Frame>(() =>
    Array(7)
      .fill(0)
      .map(() => Array(21).fill(0))
  )

  const engineRef = useRef<GameEngine | null>(null)
  const playerInputRef = useRef(0)
  const lastTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)

  const renderFrameFromEngine = (): Frame => {
    const frame: Frame = Array(7)
      .fill(0)
      .map(() => Array(21).fill(0))

    if (!engineRef.current || engineRef.current.data.state === "title") {
      const pongText = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ]
      return pongText
    }

    if (engineRef.current.data.state === "gameOver") {
      if (engineRef.current.data.winner === "player") {
        // WIN
        const winText = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0],
          [0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
        return winText
      } else {
        // LOSE
        const loseText = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
        return loseText
      }
    }

    const data = engineRef.current.data

    for (let col = 0; col < 21; col++) {
      if (col === 10) {
        for (let row = 0; row < 7; row += 2) {
          frame[row][col] = 0.2
        }
      }
    }

    const playerPaddleTop = Math.floor(data.playerPaddle.y)
    for (let i = 0; i < 3; i++) {
      const row = playerPaddleTop + i
      if (row >= 0 && row < 7) {
        frame[row][0] = 1
      }
    }

    const aiPaddleTop = Math.floor(data.aiPaddle.y)
    for (let i = 0; i < 3; i++) {
      const row = aiPaddleTop + i
      if (row >= 0 && row < 7) {
        frame[row][20] = 1
      }
    }

    const ballCol = Math.floor(data.ball.x)
    const ballRow = Math.floor(data.ball.y)
    if (ballCol >= 0 && ballCol < 21 && ballRow >= 0 && ballRow < 7) {
      frame[ballRow][ballCol] = 1
    }

    for (let i = 0; i < data.ball.trail.length; i++) {
      const trailCol = Math.floor(data.ball.trail[i].x)
      const trailRow = Math.floor(data.ball.trail[i].y)
      if (trailCol >= 0 && trailCol < 21 && trailRow >= 0 && trailRow < 7) {
        frame[trailRow][trailCol] = Math.max(
          frame[trailRow][trailCol],
          0.5 - i * 0.15
        )
      }
    }

    return frame
  }

  useEffect(() => {
    engineRef.current = new GameEngine()
    setCurrentFrame(renderFrameFromEngine())

    function gameLoop(timestamp: number) {
      if (!engineRef.current) return

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = timestamp

      engineRef.current.update(deltaTime, playerInputRef.current)

      const data = engineRef.current.data
      setGameState(data.state)
      setPlayerScore(data.playerScore)
      setAIScore(data.aiScore)

      setCurrentFrame(renderFrameFromEngine())

      if (data.state === "playing" || data.state === "paused") {
        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        playerInputRef.current = -1
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        playerInputRef.current = 1
      } else if (e.key === " ") {
        e.preventDefault()
        const state = engineRef.current?.data.state
        if (state === "title" || state === "gameOver") {
          if (engineRef.current) {
            engineRef.current.startGame()
            setCurrentFrame(renderFrameFromEngine())
            lastTimeRef.current = 0
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }
            animationFrameRef.current = requestAnimationFrame(gameLoop)
          }
        }
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        const state = engineRef.current?.data.state
        if (state === "playing" || state === "paused") {
          if (engineRef.current) {
            engineRef.current.togglePause()
            if (engineRef.current.data.state === "playing") {
              lastTimeRef.current = 0
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
              }
              animationFrameRef.current = requestAnimationFrame(gameLoop)
            } else {
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
              }
            }
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        playerInputRef.current = 0
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="flex min-h-[600px] w-full flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <PlayerIndicator />
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
              Player
            </div>
            <Matrix
              rows={7}
              cols={5}
              pattern={digits[playerScore] || digits[0]}
              size={12}
              gap={2}
              ariaLabel="Player score"
            />
          </div>

          <Matrix
            rows={7}
            cols={21}
            pattern={currentFrame}
            size={16}
            gap={3}
            ariaLabel="Pong game field"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
              NEX-T1
            </div>
            <Matrix
              rows={7}
              cols={5}
              pattern={digits[aiScore] || digits[0]}
              size={12}
              gap={2}
              ariaLabel="Nex-T1 score"
            />
          </div>
        </div>

        <div className="flex h-[28px] flex-col items-center justify-center gap-2">
          {gameState === "title" && (
            <div className="text-muted-foreground text-center text-xs">
              Press <kbd className="bg-muted rounded px-2 py-1">Space</kbd> to
              start
            </div>
          )}

          {gameState === "playing" && (
            <div className="text-muted-foreground text-center text-xs">
              <kbd className="bg-muted rounded px-2 py-1">↑</kbd>
              <kbd className="bg-muted mx-1 rounded px-2 py-1">↓</kbd>
              Move &nbsp;·&nbsp;
              <kbd className="bg-muted rounded px-2 py-1">P</kbd> Pause
            </div>
          )}

          {gameState === "paused" && (
            <div className="text-muted-foreground text-center text-xs">
              PAUSED - Press <kbd className="bg-muted rounded px-2 py-1">P</kbd>{" "}
              to resume
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="text-muted-foreground text-center text-xs">
              Press <kbd className="bg-muted rounded px-2 py-1">Space</kbd> to
              play again
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
