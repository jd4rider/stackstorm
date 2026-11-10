import { StackstormEngine } from '../src/engine/engine'
import type { EngineOptions } from '../src/engine/types'

export function step(engine: StackstormEngine, milliseconds: number): void {
  let remaining = milliseconds
  while (remaining > 0) {
    const slice = Math.min(50, remaining)
    engine.update(slice)
    remaining -= slice
  }
}

export function emptyBoard(): number[][] {
  return Array.from({ length: 20 }, () => Array<number>(10).fill(0))
}

export function started(options: EngineOptions): StackstormEngine {
  const engine = new StackstormEngine(options)
  engine.start()
  return engine
}

export function fillRow(board: number[][], row: number, value = 1): void {
  for (let column = 0; column < 10; column += 1) board[row]![column] = value
}
