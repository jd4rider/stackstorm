import { describe, expect, it } from 'vitest'
import { StackstormEngine } from '../src/engine/engine'
import { emptyBoard, step } from './helpers'

function restingEngine(): StackstormEngine {
  const engine = new StackstormEngine({ mode: 'marathon', seed: 1, lockDelayMs: 500, maxLockResets: 15 })
  engine.start()
  // The engine's board has four hidden rows: visible rows 18-19 are 22-23.
  engine.setActive('O', 0, 4, 22)
  return engine
}

describe('post-landing slide window', () => {
  it('does not lock immediately; it waits through the lock delay', () => {
    const engine = restingEngine()
    step(engine, 350)
    expect(engine.pieces).toBe(0)
    expect(engine.active).not.toBeNull()
    step(engine, 220)
    expect(engine.pieces).toBe(1)
  })

  it('lets the player slide a landed piece and restarts the delay', () => {
    const engine = restingEngine()
    step(engine, 450)
    expect(engine.move(1)).toBe(true)
    expect(engine.active!.x).toBe(5)
    step(engine, 450)
    expect(engine.pieces).toBe(0)
    step(engine, 100)
    expect(engine.pieces).toBe(1)
  })

  it('lets the player rotate a landed piece within the window', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 9, lockDelayMs: 500 })
    engine.start()
    engine.setActive('T', 0, 4, 22)
    step(engine, 430)
    expect(engine.rotate(1)).toBe(true)
    step(engine, 430)
    expect(engine.pieces).toBe(0)
    step(engine, 120)
    expect(engine.pieces).toBe(1)
  })

  it('bounds the number of move resets so a piece cannot hover forever', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 5, lockDelayMs: 200, maxLockResets: 3 })
    engine.start()
    engine.setActive('O', 0, 4, 22)
    step(engine, 150)
    for (let index = 0; index < 3; index += 1) {
      engine.move(index % 2 === 0 ? 1 : -1)
      step(engine, 150)
    }
    // Three resets used; the fourth nudge must not restart the timer.
    engine.move(1)
    step(engine, 210)
    expect(engine.pieces).toBe(1)
  })

  it('does not restart the window when the piece is airborne', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 6, lockDelayMs: 500 })
    engine.start()
    engine.setActive('O', 0, 4, 10)
    step(engine, 300)
    engine.move(1)
    expect(engine.active!.x).toBe(5)
    // Gravity keeps running; the piece is not locked by the delay while falling.
    expect(engine.pieces).toBe(0)
  })
})

describe('hold', () => {
  it('holds one piece and only once per placement', () => {
    const engine = new StackstormEngine({ mode: 'marathon', seed: 11, queue: ['T', 'I', 'O', 'S', 'Z', 'J'] })
    engine.start()
    const first = engine.active!.id
    expect(engine.holdPiece()).toBe(true)
    expect(engine.hold).toBe(first)
    expect(engine.active!.id).toBe('I')
    expect(engine.holdPiece()).toBe(false)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.holdPiece()).toBe(true)
    expect(engine.active!.id).toBe(first)
    expect(engine.hold).toBe('O')
  })

  it('is available in puzzle mode now that Journey runs are endless', () => {
    const engine = new StackstormEngine({ mode: 'puzzle', queue: ['I', 'O'], scoreTarget: 5_000 })
    engine.start()
    expect(engine.holdPiece()).toBe(true)
    expect(engine.hold).toBe('I')
    expect(engine.active?.id).toBe('O')
  })
})

describe('line clears', () => {
  it('clears a completed row after the animation window', () => {
    const board = emptyBoard()
    for (let column = 0; column < 10; column += 1) board[19]![column] = 8
    for (let column = 0; column < 4; column += 1) board[19]![column] = 0
    const engine = new StackstormEngine({ mode: 'marathon', seed: 1, board, queue: ['I', 'O'] })
    engine.start()
    engine.setActive('I', 0, 0, 22)
    expect(engine.hardDrop()).toBe(0)
    expect(engine.status).toBe('clearing')
    step(engine, 400)
    expect(engine.lines).toBe(1)
    expect(engine.status).toBe('playing')
    expect(engine.board[23]!.every((cell) => cell === 0)).toBe(true)
    expect(engine.score).toBeGreaterThanOrEqual(100)
  })

  it('scores a four-line clear at level one as 800 plus hard-drop points', () => {
    const board = emptyBoard()
    for (let row = 16; row < 20; row += 1) {
      for (let column = 0; column < 10; column += 1) board[row]![column] = 8
      board[row]![9] = 0
    }
    const engine = new StackstormEngine({ mode: 'marathon', seed: 2, board, queue: ['I', 'O'] })
    engine.start()
    expect(engine.setActive('I', 1, 7, 20)).toBe(true)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.lines).toBe(4)
    expect(engine.fourLines).toBe(1)
    expect(engine.score).toBeGreaterThanOrEqual(800)
  })

  it('awards combo points for consecutive clears', () => {
    const board = emptyBoard()
    for (let row = 17; row < 20; row += 1) {
      for (let column = 0; column < 10; column += 1) board[row]![column] = 8
      board[row]![0] = 0
      board[row]![1] = 0
    }
    const engine = new StackstormEngine({ mode: 'marathon', seed: 3, board, queue: ['O', 'O', 'O'] })
    engine.start()
    engine.setActive('O', 0, 0, 22)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.combo).toBe(1)
    const scoreAfterFirst = engine.score
    expect(scoreAfterFirst).toBeGreaterThan(0)
    // The third row shifted down; the next O fills it for a second, chained clear.
    expect(engine.active!.id).toBe('O')
    engine.setActive('O', 0, 0, 22)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.combo).toBe(2)
    expect(engine.score).toBeGreaterThan(scoreAfterFirst + 100)
  })

  it('detects a T-spin when three corners are occupied', () => {
    const board = emptyBoard()
    // Three corners of the T's 3x3 box are occupied, with room for the kick.
    board[17]![3] = 8
    board[17]![5] = 8
    board[19]![3] = 8
    board[19]![5] = 8
    const engine = new StackstormEngine({ mode: 'marathon', seed: 4, board, queue: ['T', 'I'] })
    engine.start()
    expect(engine.setActive('T', 0, 3, 21)).toBe(true)
    expect(engine.rotate(1)).toBe(true)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.tspins).toBe(1)
  })
})

describe('goals and timing', () => {
  it('wins sprint when the line goal is reached', () => {
    const board = emptyBoard()
    for (let column = 0; column < 10; column += 1) board[19]![column] = 8
    for (let column = 0; column < 4; column += 1) board[19]![column] = 0
    const engine = new StackstormEngine({ mode: 'sprint', seed: 1, board, queue: ['I'], linesTarget: 1 })
    engine.start()
    engine.setActive('I', 0, 0, 22)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.status).toBe('won')
  })

  it('ends a time attack when the clock expires', () => {
    const engine = new StackstormEngine({ mode: 'timeattack', seed: 1, timeLimitMs: 1000 })
    engine.start()
    step(engine, 1100)
    expect(engine.status).toBe('over')
    expect(engine.timeRemainingMs).toBe(0)
  })

  it('freezes the clock while paused', () => {
    const engine = new StackstormEngine({ mode: 'timeattack', seed: 1, timeLimitMs: 1000 })
    engine.start()
    step(engine, 400)
    engine.pause()
    step(engine, 2000)
    expect(engine.status).toBe('paused')
    expect(engine.timeRemainingMs).toBeGreaterThan(500)
    engine.resume()
    expect(engine.status).toBe('playing')
  })

  it('charges the storm meter and activates a surge', () => {
    const board = emptyBoard()
    for (let row = 16; row < 20; row += 1) {
      for (let column = 0; column < 10; column += 1) board[row]![column] = 8
      board[row]![9] = 0
    }
    const engine = new StackstormEngine({ mode: 'storm', seed: 7, board, queue: ['I', 'O'] })
    engine.start()
    expect(engine.setActive('I', 1, 7, 20)).toBe(true)
    engine.hardDrop()
    step(engine, 400)
    expect(engine.stormMeter).toBeGreaterThan(0)
    engine.stormMeter = 100
    expect(engine.activateStorm()).toBe(true)
    expect(engine.stormRemainingMs).toBeGreaterThan(0)
    step(engine, 13_000)
    expect(engine.stormRemainingMs).toBe(0)
  })
})
