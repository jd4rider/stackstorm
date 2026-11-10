export type PieceId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Rotation = 0 | 1 | 2 | 3
export type Board = number[][]
export type GameMode = 'marathon' | 'storm' | 'sprint' | 'timeattack' | 'puzzle'
export type EngineStatus = 'ready' | 'playing' | 'clearing' | 'paused' | 'over' | 'won'

export const PIECE_IDS: PieceId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
export const PIECE_INDEX: Record<PieceId, number> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 }
export const INDEX_PIECE: PieceId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
export const OBSTACLE = 8

export interface Cell {
  x: number
  y: number
}

export interface ActivePiece {
  id: PieceId
  rotation: Rotation
  x: number
  y: number
}

export type EngineEvent =
  | { type: 'spawn'; piece: PieceId }
  | { type: 'move' }
  | { type: 'rotate'; kick: number }
  | { type: 'softDrop'; cells: number }
  | { type: 'lock'; piece: PieceId; cells: Cell[]; row: number }
  | { type: 'hardDrop'; distance: number; cells: Cell[]; piece: PieceId }
  | {
      type: 'clear'
      rows: number[]
      lines: number
      points: number
      tspin: boolean
      b2b: boolean
      combo: number
      perfect: boolean
      level: number
    }
  | { type: 'levelUp'; level: number }
  | { type: 'hold'; held: PieceId; swapped: PieceId | null }
  | { type: 'stormMeter'; meter: number }
  | { type: 'stormSurge'; active: boolean }
  | { type: 'gameOver'; reason: 'blockout' | 'time' | 'pieces' }
  | { type: 'win'; reason: 'lines' | 'objective' }

export interface EngineOptions {
  mode: GameMode
  seed?: number
  cols?: number
  visibleRows?: number
  hiddenRows?: number
  /** Fixed upcoming pieces. Puzzle levels use this instead of the bag. */
  queue?: PieceId[]
  /** A 20-row visible board (without the hidden spawn rows). */
  board?: number[][]
  startLevel?: number
  linesTarget?: number
  /** Reach this score to win (Journey levels). */
  scoreTarget?: number
  timeLimitMs?: number
  /** Milliseconds per gravity step; otherwise derived from the level. */
  gravityMs?: number
  lockDelayMs?: number
  maxLockResets?: number
  dasMs?: number
  arrMs?: number
  softDropMs?: number
  clearMs?: number
}

export interface ClearResult {
  rows: number[]
  lines: number
  points: number
  tspin: boolean
  b2b: boolean
  combo: number
  perfect: boolean
}

export interface EngineSnapshot {
  status: EngineStatus
  score: number
  lines: number
  level: number
  combo: number
  maxCombo: number
  b2b: number
  pieces: number
  elapsedMs: number
  timeRemainingMs: number | null
  stormMeter: number
  stormActive: boolean
  stormRemainingMs: number
  grounded: boolean
  lockProgress: number
  lockResets: number
}
