import { describe, expect, it } from 'vitest'
import { boxSize, kicksFor, SHAPES, shapeCells, spawnX } from '../src/engine/pieces'
import { SevenBag, makeRng } from '../src/engine/rng'
import { collides, createBoard, dropDistance, pieceCells } from '../src/engine/board'
import { PIECE_IDS } from '../src/engine/types'
import { StackstormEngine } from '../src/engine/engine'
import { step } from './helpers'

describe('tetromino data', () => {
  it('defines four rotations of exactly four in-box cells for every piece', () => {
    for (const id of PIECE_IDS) {
      expect(SHAPES[id]).toHaveLength(4)
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const cells = SHAPES[id][rotation]!
        expect(cells, `${id} r${rotation}`).toHaveLength(4)
        const unique = new Set(cells.map((cell) => `${cell.x},${cell.y}`))
        expect(unique.size, `${id} r${rotation}`).toBe(4)
        for (const cell of cells) {
          expect(cell.x).toBeGreaterThanOrEqual(0)
          expect(cell.y).toBeGreaterThanOrEqual(0)
          expect(cell.x).toBeLessThan(boxSize(id))
          expect(cell.y).toBeLessThan(boxSize(id))
        }
      }
    }
  })

  it('keeps O identical through every rotation', () => {
    const first = SHAPES.O[0]
    for (let rotation = 1; rotation < 4; rotation += 1) expect(SHAPES.O[rotation]).toEqual(first)
  })

  it('provides an SRS kick table for every transition', () => {
    for (const id of PIECE_IDS) {
      for (let from = 0; from < 4; from += 1) {
        for (const direction of [1, -1]) {
          const to = (from + direction + 4) % 4
          const kicks = kicksFor(id, from as 0 | 1 | 2 | 3, to as 0 | 1 | 2 | 3)
          expect(kicks.length).toBeGreaterThanOrEqual(1)
          expect(kicks[0]).toEqual({ x: 0, y: 0 })
        }
      }
    }
  })

  it('spawns every piece inside a ten-column board', () => {
    for (const id of PIECE_IDS) {
      for (const cell of shapeCells(id, 0)) {
        expect(spawnX(id) + cell.x).toBeGreaterThanOrEqual(0)
        expect(spawnX(id) + cell.x).toBeLessThan(10)
      }
    }
  })
})

describe('collision', () => {
  it('blocks the walls and the floor', () => {
    const board = createBoard(10, 24)
    expect(collides(board, 'I', 1, -2, 5, 10)).toBe(false)
    expect(collides(board, 'I', 1, -3, 5, 10)).toBe(true)
    expect(collides(board, 'I', 0, -1, 5, 10)).toBe(true)
    expect(collides(board, 'I', 0, 7, 5, 10)).toBe(true)
    expect(collides(board, 'O', 0, 9, 5, 10)).toBe(true)
    expect(collides(board, 'O', 0, 4, 23, 10)).toBe(true)
  })

  it('blocks occupied cells and counts an exact drop distance', () => {
    const board = createBoard(10, 24)
    for (let column = 0; column < 10; column += 1) board[20]![column] = 1
    expect(dropDistance(board, 'I', 0, 3, 0, 10)).toBe(18)
    expect(dropDistance(board, 'O', 0, 4, 0, 10)).toBe(18)
  })

  it('locks a piece into the grid without overlapping', () => {
    const board = createBoard(10, 24)
    const cells = pieceCells('T', 0, 3, 10)
    expect(cells).toHaveLength(4)
    for (const cell of cells) expect(board[cell.y]![cell.x]).toBe(0)
  })
})

describe('seven-bag', () => {
  it('presents all seven pieces exactly once per bag', () => {
    const bag = new SevenBag(42)
    for (let round = 0; round < 30; round += 1) {
      const pieces = Array.from({ length: 7 }, () => bag.next())
      expect(new Set(pieces).size).toBe(7)
      expect([...pieces].sort()).toEqual([...PIECE_IDS].sort())
    }
  })

  it('is reproducible from a seed and different across seeds', () => {
    const sequence = (seed: number) => {
      const bag = new SevenBag(seed)
      return Array.from({ length: 35 }, () => bag.next()).join('')
    }
    expect(sequence(7)).toBe(sequence(7))
    expect(sequence(7)).not.toBe(sequence(8))
  })

  it('produces deterministic floats in [0, 1)', () => {
    const random = makeRng(99)
    for (let index = 0; index < 100; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('engine basics', () => {
  it('spawns every piece already visible inside the well', () => {
    for (const id of PIECE_IDS) {
      const engine = new StackstormEngine({ mode: 'marathon', seed: 1, queue: [id] })
      engine.start()
      const active = engine.active!
      const cells = pieceCells(active.id, active.rotation, active.x, active.y)
      expect(cells.some((cell) => cell.y >= engine.hiddenRows), `${id} should be on screen`).toBe(true)
    }
  })

  it('keeps gravity real-time even when one frame is long', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 1, queue: ['O'] })
    engine.start()
    const spawnY = engine.active!.y
    engine.update(1020)
    expect(engine.active!.y).toBe(spawnY + 1)
  })

  it('drops puzzle pieces at the puzzle interval', () => {
    const engine = new StackstormEngine({ mode: 'puzzle', queue: ['I', 'O'], linesTarget: 1 })
    engine.start()
    const spawnY = engine.active!.y
    engine.update(920)
    expect(engine.active!.y).toBe(spawnY + 1)
  })

  it('spawns and falls under its own gravity', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 1 })
    engine.start()
    const first = engine.active!.id
    expect(engine.status).toBe('playing')
    step(engine, 1020)
    expect(engine.active).not.toBeNull()
    expect(['playing', 'clearing']).toContain(engine.status)
    expect(PIECE_IDS).toContain(first)
  })

  it('moves, rotates and hard drops within the rules', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 2 })
    engine.start()
    const before = engine.active!.x
    expect(engine.move(-1)).toBe(true)
    expect(engine.active!.x).toBe(before - 1)
    expect(engine.rotate(1)).toBe(true)
    const distance = engine.hardDrop()
    expect(distance).toBeGreaterThan(0)
    expect(engine.pieces).toBe(1)
    expect(engine.score).toBeGreaterThanOrEqual(distance * 2)
  })

  it('kicks a T piece away from the left wall', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 3 })
    engine.start()
    expect(engine.setActive('T', 0, 0, 6)).toBe(true)
    expect(engine.rotate(1)).toBe(true)
    expect(engine.active!.rotation).toBe(1)
  })

  it('never lets a piece move through the wall', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 4 })
    engine.start()
    expect(engine.setActive('O', 0, 0, 3)).toBe(true)
    for (let index = 0; index < 8; index += 1) engine.move(-1)
    expect(engine.active!.x).toBe(0)
    expect(engine.move(-1)).toBe(false)
  })

  it('reproduces the same result for the same seed and inputs', () => {
    const run = () => {
      const engine = new StackstormEngine({ mode: 'marathon', seed: 1234 })
      engine.start()
      for (let index = 0; index < 12; index += 1) {
        engine.move(index % 2 === 0 ? -1 : 1)
        engine.rotate(index % 3 === 0 ? 1 : -1)
        engine.hardDrop()
        step(engine, 400)
      }
      return { score: engine.score, pieces: engine.pieces, lines: engine.lines, board: engine.board }
    }
    expect(run()).toEqual(run())
  })
})
