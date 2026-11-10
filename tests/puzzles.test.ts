import { describe, expect, it } from 'vitest'
import { StackstormEngine } from '../src/engine/engine'
import { BAND_VALUE, targetsFor, wallClearLines, wellColumns } from '../src/puzzles/levelGeometry'
import { LEVELS, LEVELS_PER_WORLD, TOTAL_LEVELS, levelsForWorld } from '../src/puzzles/levels'

describe('journey catalogue', () => {
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
      expect(level.bands).toBeGreaterThanOrEqual(1)
      expect(level.bands).toBeLessThanOrEqual(3)
    }
  })

  it('never starts with an already-complete row', () => {
    for (const level of LEVELS) {
      for (const row of level.board) expect(row.every((cell) => cell !== 0)).toBe(false)
    }
  })

  it('leaves at least eight empty rows to play in above the stone', () => {
    for (const level of LEVELS) {
      const stoneRows = level.board.filter((row) => row.some((cell) => cell === 8)).length
      expect(stoneRows, level.id).toBe(level.bands * 4)
      expect(20 - stoneRows, level.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('carves at least one well through every wall', () => {
    for (const level of LEVELS) {
      expect(wellColumns(level.board).length, level.id).toBeGreaterThan(0)
    }
  })

  it('clears the entire wall with I pieces in the real engine', () => {
    for (const level of LEVELS) {
      expect(wallClearLines(level), `${level.id} must clear ${level.bands * 4} lines`).toBe(level.bands * 4)
    }
  })

  it('sets a target above the value of the wall itself', () => {
    for (const level of LEVELS) {
      expect(level.scoreTarget, level.id).toBeGreaterThanOrEqual(BAND_VALUE * level.bands)
      expect(level.scoreTarget % 50).toBe(0)
      expect(level.twoStarScore).toBeGreaterThan(level.scoreTarget)
      expect(level.threeStarScore).toBeGreaterThan(level.twoStarScore)
      expect(level).toMatchObject(targetsFor(level.bands, level.index))
    }
  })

  it('is a long run, not a three-move puzzle', () => {
    // Even the gentlest level asks for more than one clear, and the target has
    // to be reached before the stack tops out, so a level cannot end in a
    // handful of drops unless the player deliberately stacks out.
    for (const level of LEVELS) {
      expect(level.scoreTarget).toBeGreaterThan(BAND_VALUE)
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

  it('grows the wall in later worlds', () => {
    expect(levelsForWorld(10)[0]!.bands).toBeGreaterThan(levelsForWorld(1)[0]!.bands)
    expect(levelsForWorld(10)[49]!.scoreTarget).toBeGreaterThan(levelsForWorld(1)[0]!.scoreTarget)
  })

  it('wins a run as soon as the target score is reached', () => {
    const level = levelsForWorld(1)[0]!
    const engine = new StackstormEngine({
      mode: 'puzzle',
      seed: 7,
      board: level.board,
      scoreTarget: 10,
      clearMs: 16,
    })
    engine.start()
    expect(engine.status).toBe('playing')
    engine.hardDrop()
    expect(engine.score).toBeGreaterThanOrEqual(10)
    expect(engine.status).toBe('won')
  })

  it('keeps playing after a level would once have ended, until the stack tops out', () => {
    const level = levelsForWorld(1)[0]!
    const engine = new StackstormEngine({ mode: 'puzzle', seed: 11, board: level.board, scoreTarget: level.scoreTarget })
    engine.start()
    // Stack pieces in one column with no attempt to clear: the run must keep
    // going for many pieces and only end by topping out.
    let drops = 0
    while (engine.status === 'playing' && drops < 200) {
      engine.setActive('O', 0, 0, 0)
      engine.hardDrop()
      for (let tick = 0; tick < 8; tick += 1) engine.update(5)
      drops += 1
    }
    expect(drops).toBeGreaterThan(8)
    expect(['over', 'won']).toContain(engine.status)
  })
})
