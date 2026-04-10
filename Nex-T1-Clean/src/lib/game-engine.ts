import { soundManager } from "@/lib/sound-manager"

export type GameState =
  | "title"
  | "countdown"
  | "playing"
  | "paused"
  | "gameOver"

export interface Ball {
  x: number
  y: number
  velX: number
  velY: number
  trail: Array<{ x: number; y: number }>
}

export interface Paddle {
  y: number
  targetY: number
}

export interface GameData {
  state: GameState
  ball: Ball
  playerPaddle: Paddle
  aiPaddle: Paddle
  playerScore: number
  aiScore: number
  countdown: number
  winner: "player" | "ai" | null
}

const FIELD_WIDTH = 21
const FIELD_HEIGHT = 7
const PADDLE_HEIGHT = 3
const MAX_SPEED = 0.4
const INITIAL_SPEED = 0.15
const SPEED_INCREASE = 1.08
const WIN_SCORE = 3
const AI_REACTION_SPEED = 0.22
const AI_PREDICTION_ERROR = 0.3

export class GameEngine {
  data: GameData

  constructor() {
    this.data = this.createInitialState()
  }

  private createInitialState(): GameData {
    return {
      state: "title",
      ball: {
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 2,
        velX: INITIAL_SPEED,
        velY: INITIAL_SPEED * 0.8,
        trail: [],
      },
      playerPaddle: {
        y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        targetY: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      },
      aiPaddle: {
        y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        targetY: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      },
      playerScore: 0,
      aiScore: 0,
      countdown: 3,
      winner: null,
    }
  }

  startGame() {
    this.data = {
      ...this.createInitialState(),
      state: "playing",
    }
    soundManager.play("gameStart")
  }

  resetBall(toPlayer: boolean) {
    this.data.ball = {
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      velX: toPlayer ? -INITIAL_SPEED : INITIAL_SPEED,
      velY: (Math.random() - 0.5) * INITIAL_SPEED * 1.5,
      trail: [],
    }
  }

  update(deltaTime: number, playerInput: number) {
    if (this.data.state !== "playing") return

    this.updatePaddles(deltaTime, playerInput)
    this.updateBall(deltaTime)
    this.checkCollisions()
  }

  private updatePaddles(deltaTime: number, playerInput: number) {
    if (playerInput !== 0) {
      const moveSpeed = 50
      const movement = playerInput * deltaTime * moveSpeed

      this.data.playerPaddle.y = Math.max(
        0,
        Math.min(
          FIELD_HEIGHT - PADDLE_HEIGHT,
          this.data.playerPaddle.y + movement
        )
      )
      this.data.playerPaddle.targetY = this.data.playerPaddle.y
    }

    const predictedY =
      this.data.ball.y +
      (this.data.ball.velY / Math.abs(this.data.ball.velX)) *
        (FIELD_WIDTH - 2 - this.data.ball.x) +
      (Math.random() - 0.5) * AI_PREDICTION_ERROR

    this.data.aiPaddle.targetY = Math.max(
      0,
      Math.min(FIELD_HEIGHT - PADDLE_HEIGHT, predictedY - PADDLE_HEIGHT / 2)
    )

    const aiDiff = this.data.aiPaddle.targetY - this.data.aiPaddle.y
    this.data.aiPaddle.y +=
      Math.sign(aiDiff) *
      Math.min(Math.abs(aiDiff), AI_REACTION_SPEED * deltaTime * 60)
  }

  private updateBall(deltaTime: number) {
    this.data.ball.trail.unshift({
      x: this.data.ball.x,
      y: this.data.ball.y,
    })

    if (this.data.ball.trail.length > 3) {
      this.data.ball.trail.pop()
    }

    this.data.ball.x += this.data.ball.velX * deltaTime * 60
    this.data.ball.y += this.data.ball.velY * deltaTime * 60
  }

  private checkCollisions() {
    if (this.data.ball.y <= 0.5) {
      this.data.ball.y = 0.5
      this.data.ball.velY = Math.abs(this.data.ball.velY)
      soundManager.play("wallHit")
    }

    if (this.data.ball.y >= FIELD_HEIGHT - 0.5) {
      this.data.ball.y = FIELD_HEIGHT - 0.5
      this.data.ball.velY = -Math.abs(this.data.ball.velY)
      soundManager.play("wallHit")
    }

    if (
      this.data.ball.x <= 1 &&
      this.data.ball.velX < 0 &&
      this.data.ball.y >= this.data.playerPaddle.y - 0.5 &&
      this.data.ball.y <= this.data.playerPaddle.y + PADDLE_HEIGHT + 0.5
    ) {
      this.data.ball.x = 1
      this.data.ball.velX = Math.abs(this.data.ball.velX) * SPEED_INCREASE

      const hitPos =
        (this.data.ball.y - this.data.playerPaddle.y - PADDLE_HEIGHT / 2) /
        (PADDLE_HEIGHT / 2)
      this.data.ball.velY += hitPos * 0.15

      const speed = Math.sqrt(
        this.data.ball.velX ** 2 + this.data.ball.velY ** 2
      )
      if (speed > MAX_SPEED) {
        this.data.ball.velX = (this.data.ball.velX / speed) * MAX_SPEED
        this.data.ball.velY = (this.data.ball.velY / speed) * MAX_SPEED
      }

      soundManager.play("paddleHit")
    }

    if (
      this.data.ball.x >= FIELD_WIDTH - 2 &&
      this.data.ball.velX > 0 &&
      this.data.ball.y >= this.data.aiPaddle.y - 0.5 &&
      this.data.ball.y <= this.data.aiPaddle.y + PADDLE_HEIGHT + 0.5
    ) {
      this.data.ball.x = FIELD_WIDTH - 2
      this.data.ball.velX = -Math.abs(this.data.ball.velX) * SPEED_INCREASE

      const hitPos =
        (this.data.ball.y - this.data.aiPaddle.y - PADDLE_HEIGHT / 2) /
        (PADDLE_HEIGHT / 2)
      this.data.ball.velY += hitPos * 0.15

      const speed = Math.sqrt(
        this.data.ball.velX ** 2 + this.data.ball.velY ** 2
      )
      if (speed > MAX_SPEED) {
        this.data.ball.velX = (this.data.ball.velX / speed) * MAX_SPEED
        this.data.ball.velY = (this.data.ball.velY / speed) * MAX_SPEED
      }

      soundManager.play("paddleHit")
    }

    if (this.data.ball.x < 0) {
      this.data.aiScore++
      soundManager.play("score")

      if (this.data.aiScore >= WIN_SCORE) {
        this.data.state = "gameOver"
        this.data.winner = "ai"
        soundManager.play("win")
      } else {
        this.resetBall(false)
      }
    }

    if (this.data.ball.x > FIELD_WIDTH) {
      this.data.playerScore++
      soundManager.play("score")

      if (this.data.playerScore >= WIN_SCORE) {
        this.data.state = "gameOver"
        this.data.winner = "player"
        soundManager.play("win")
      } else {
        this.resetBall(true)
      }
    }
  }

  togglePause() {
    if (this.data.state === "playing") {
      this.data.state = "paused"
    } else if (this.data.state === "paused") {
      this.data.state = "playing"
    }
  }

  tickCountdown() {
    if (this.data.state !== "countdown") return

    this.data.countdown--
    if (this.data.countdown <= 0) {
      this.data.state = "playing"
    }
  }
}
