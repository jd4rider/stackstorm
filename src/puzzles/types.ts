import type { PieceId, Rotation } from '../engine/types'

export interface PuzzleAction {
  rotation: Rotation
  x: number
}

export interface PuzzleLevel {
  id: string
  world: number
  index: number
  name: string
  /** Twenty visible rows of 0 (empty) or 8 (stone). */
  board: number[][]
  /** The exact piece order the player receives. */
  sequence: PieceId[]
  linesTarget: number
  goldMs: number
  parMs: number
  /** One proven placement per sequence piece. */
  solution: PuzzleAction[]
}

export interface LevelFile {
  version: number
  generatedAt: string
  levels: PuzzleLevel[]
}
