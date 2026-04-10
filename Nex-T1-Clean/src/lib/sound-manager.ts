import { logger } from '@/lib/logger';

type SoundType = "paddleHit" | "wallHit" | "score" | "gameStart" | "win"

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map()
  private volume = 0.3

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSounds()
    }
  }

  private loadSounds() {
    const soundFiles: Record<SoundType, string> = {
      paddleHit: "https://ui.elevenlabs.io/sounds/pong/paddle_hit.mp3",
      wallHit: "https://ui.elevenlabs.io/sounds/pong/wall_hit.mp3",
      score: "https://ui.elevenlabs.io/sounds/pong/score.mp3",
      gameStart: "https://ui.elevenlabs.io/sounds/pong/game_start.mp3",
      win: "https://ui.elevenlabs.io/sounds/pong/win.mp3",
    }

    for (const [key, path] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(path)
        audio.volume = this.volume
        audio.preload = "auto"
        this.sounds.set(key as SoundType, audio)
      } catch {
        logger.warn(`Failed to load sound: ${path}`)
      }
    }
  }

  play(sound: SoundType) {
    const audio = this.sounds.get(sound)
    if (!audio) return

    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore play errors (e.g., user hasn't interacted with page yet)
    })
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    this.sounds.forEach((audio) => {
      audio.volume = this.volume
    })
  }
}

export const soundManager = new SoundManager()
