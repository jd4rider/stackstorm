import { describe, expect, it } from 'vitest'
import { StackstormEngine } from '../src/engine/engine'
import { LEVELS, LEVELS_PER_WORLD, TOTAL_LEVELS, levelsForWorld } from '../src/puzzles/levels'
import type { PuzzleLevel } from '../src/puzzles/types'

function replay(level: PuzzleLevel): { won: boolean; lines: number } {
  const engine = new StackstormEngine({
    mode: 'puzzle',
    board: level.board,
    queue: level.sequence,
    linesTarget: level.linesTarget,
    clearMs: 16,
    lockDelayMs: 60_000,
  })
  engine.start()
  for (let index = 0; index < level.sequence.length; index += 1) {
    if (engine.status === 'won') break
    if (engine.status !== 'playing') return { won: false, lines: engine.lines }
    const action = level.solution[index]
    if (!action) return { won: false, lines: engine.lines }
    if (!engine.setActive(level.sequence[index]!, action.rotation, action.x, 0)) {
      return { won: false, lines: engine.lines }
    }
    engine.hardDrop()
    for (let tick = 0; tick < 6; tick += 1) engine.update(5)
  }
  return { won: engine.status === 'won', lines: engine.lines }
}

describe('puzzle catalogue', () => {
  it('ships 500 levels across ten worlds of fifty', () => {
    expect(TOTAL_LEVELS).toBe(500)
    for (let world = 1; world <= 10; world += 1) {
      expect(levelsForWorld(world), `world ${world}`).toHaveLength(LEVELS_PER_WORLD)
    }
  })

  it('has unique ids and a valid twenty-by-ten board on every level', () => {
    const ids = new Set<string>()
    for (const level of LEVELS) {
      expect(ids.has(level.id), level.id).toBe(false)
      ids.add(level.id)
      expect(level.board).toHaveLength(20)
      for (const row of level.board) {
        expect(row).toHaveLength(10)
        for (const cell of row) expect([0, 8]).toContain(cell)
      }
      expect(level.sequence.length).toBe(level.solution.length)
      expect(level.sequence.length).toBeGreaterThan(0)
      expect(level.linesTarget % 4).toBe(0)
      expect(level.linesTarget).toBeGreaterThanOrEqual(4)
      expect(level.goldMs).toBeLessThan(level.parMs)
      expect(level.parMs).toBeGreaterThan(0)
    }
  })

  it('never starts with an already-complete row', () => {
    for (const level of LEVELS) {
      for (const row of level.board) expect(row.every((cell) => cell !== 0)).toBe(false)
    }
  })

  it('replays the stored solution of every level through the real engine', () => {
    for (const level of LEVELS) {
      const result = replay(level)
      expect(result.won, `${level.id} must be completable`).toBe(true)
      expect(result.lines).toBeGreaterThanOrEqual(level.linesTarget)
    }
  })

  it('teaches the well with a single I piece before adding decoys', () => {
    expect(levelsForWorld(1)[0]!.sequence).toEqual(['I'])
    for (const level of levelsForWorld(1).slice(1, 25)) {
      expect(level.sequence.some((id) => id !== 'I'), level.id).toBe(true)
    }
  })

  it('never repeats the previous board back to back', () => {
    for (let world = 1; world <= 10; world += 1) {
      const levels = levelsForWorld(world)
      for (let index = 1; index < levels.length; index += 1) {
        const previous = JSON.stringify(levels[index - 1]!.board)
        expect(JSON.stringify(levels[index]!.board), levels[index]!.id).not.toBe(previous)
      }
    }
  })

  it('grows the sequence length in later worlds', () => {
    const average = (world: number) => {
      const levels = levelsForWorld(world)
      return levels.reduce((sum, level) => sum + level.sequence.length, 0) / levels.length
    }
    expect(average(10)).toBeGreaterThan(average(1))
  })
})
