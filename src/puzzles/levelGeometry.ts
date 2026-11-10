import { StackstormEngine } from '../engine/engine'
import { LINE_POINTS } from '../engine/scoring'
import type { PuzzleLevel } from './types'

/** Four rows cleared at once, at level one. */
export const BAND_VALUE = LINE_POINTS[4]!

/** Columns with no stone at all: the lanes a vertical I can fall down. */
export function wellColumns(board: number[][]): number[] {
  const columns: number[] = []
  for (let column = 0; column < 10; column += 1) {
    if (board.every((row) => (row[column] ?? 0) === 0)) columns.push(column)
  }
  return columns
}

/**
 * Clear the whole wall with vertical I pieces through the real engine.
 * Returns the number of lines cleared, which must be four per band.
 */
export function wallClearLines(level: PuzzleLevel): number {
  const columns = wellColumns(level.board)
  const pieces = level.bands * columns.length
  const engine = new StackstormEngine({
    mode: 'puzzle',
    board: level.board,
    queue: Array.from({ length: pieces }, () => 'I' as const),
    clearMs: 16,
    lockDelayMs: 60_000,
  })
  engine.start()
  for (let band = 0; band < level.bands; band += 1) {
    for (const column of columns) {
      if (engine.status !== 'playing') return engine.lines
      if (!engine.setActive('I', 1, column - 2, 0)) return -1
      engine.hardDrop()
      for (let tick = 0; tick < 8; tick += 1) engine.update(5)
    }
  }
  return engine.lines
}

const roundTo = (value: number, step = 50): number => Math.round(value / step) * step

/**
 * The wall pays 800 a band, so the target asks for the whole wall plus 400,
 * with a gentle step across the fifty levels. Clearing the wall once and
 * keeping the stack tidy reaches one star.
 */
export function targetsFor(
  bands: number,
  index: number,
): { scoreTarget: number; twoStarScore: number; threeStarScore: number } {
  const wallValue = BAND_VALUE * bands + 400
  const scoreTarget = roundTo(wallValue * (1 + (index - 1) * 0.01))
  return {
    scoreTarget,
    twoStarScore: roundTo(scoreTarget * 1.3),
    threeStarScore: roundTo(scoreTarget * 1.65),
  }
}
