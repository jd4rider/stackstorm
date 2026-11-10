/*
 * Journey level builder.
 *
 * Every level is constructed from a working solution rather than generated and
 * hoped over. The board is a wall of stone with one or two empty wells reaching
 * the top; the stored solution drops vertical I pieces down those wells. Decoy
 * pieces are placed on the solid shoulders first, so the player has to keep the
 * wells clear while spending them.
 *
 * The last step of this script replays every stored solution through the real
 * engine. A level that does not finish with the objective met is discarded, and
 * the attempt is retried with fewer decoys. That is why the shipped JSON can be
 * trusted: it was produced by the same rules the game runs.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { StackstormEngine } from '../src/engine/engine'
import { SHAPES } from '../src/engine/pieces'
import { makeRng } from '../src/engine/rng'
import { puzzleTimes } from '../src/engine/scoring'
import { PIECE_IDS, type PieceId, type Rotation } from '../src/engine/types'
import { WORLDS } from '../src/data/worlds'
import type { LevelFile, PuzzleAction, PuzzleLevel } from '../src/puzzles/types'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'src', 'puzzles', 'levels.json')
const LEVELS_PER_WORLD = 50
const TOTAL = WORLDS.length * LEVELS_PER_WORLD

function emptyBoard(): number[][] {
  return Array.from({ length: 20 }, () => Array<number>(10).fill(0))
}

function footprint(id: PieceId, rotation: Rotation, x: number): number[] {
  return [...new Set(SHAPES[id][rotation]!.map((cell) => x + cell.x))]
}

function minMaxX(id: PieceId, rotation: Rotation): { min: number; max: number } {
  const xs = SHAPES[id][rotation]!.map((cell) => cell.x)
  return { min: Math.min(...xs), max: Math.max(...xs) }
}

function buildBoard(bands: number, wells: { base: number; width: number }[]): number[][] {
  const board = emptyBoard()
  const height = bands * 4
  for (let row = 20 - height; row < 20; row += 1) {
    board[row] = Array<number>(10).fill(8)
  }
  for (const well of wells) {
    for (let row = 20 - height; row < 20; row += 1) {
      for (let offset = 0; offset < well.width; offset += 1) board[row]![well.base + offset] = 0
    }
  }
  return board
}

interface Candidate {
  board: number[][]
  sequence: PieceId[]
  solution: PuzzleAction[]
  linesTarget: number
  bands: number
}

function makeCandidate(world: number, index: number, decoys: number, seed: number): Candidate {
  const random = makeRng(seed)
  const bands = 1 + (index > 34 ? 2 : index > 17 ? 1 : 0)
  const height = bands * 4
  const wide = world >= 4 && index > 12
  const twoWells = world >= 6 && index > 25
  const width = wide ? 2 : 1

  const wells: { base: number; width: number }[] = []
  // Walk a fixed pattern of well positions instead of rolling each one: a step
  // of five through the available slots visits every column before repeating,
  // so neighbouring levels never end up as the same board.
  const slots = 10 - width
  const firstBase = ((index - 1) * 5 + world * 2) % slots
  wells.push({ base: firstBase, width })
  if (twoWells) {
    const secondWidth = random() < 0.5 ? 1 : width
    let secondBase = 1 + Math.floor(random() * (10 - secondWidth - 1))
    if (Math.abs(secondBase - wells[0]!.base) < width + secondWidth + 1) {
      secondBase = wells[0]!.base + width + 2 < 10 - secondWidth ? wells[0]!.base + width + 2 : wells[0]!.base - secondWidth - 2
    }
    secondBase = Math.max(0, Math.min(10 - secondWidth, secondBase))
    if (Math.abs(secondBase - wells[0]!.base) >= width + secondWidth) {
      wells.push({ base: secondBase, width: secondWidth })
    }
  }

  const board = buildBoard(bands, wells)
  const wellColumns = new Set<number>()
  for (const well of wells) {
    for (let offset = 0; offset < well.width; offset += 1) wellColumns.add(well.base + offset)
  }

  const sequence: PieceId[] = []
  const solution: PuzzleAction[] = []

  // Decoys first: they land on the solid shoulders, never in a well.
  const decoyPool: PieceId[] = PIECE_IDS.filter((id) => id !== 'I')
  for (let count = 0; count < decoys; count += 1) {
    let placed = false
    for (let attempt = 0; attempt < 24 && !placed; attempt += 1) {
      const id = decoyPool[Math.floor(random() * decoyPool.length)]!
      const rotation = Math.floor(random() * 4) as Rotation
      const { min, max } = minMaxX(id, rotation)
      const lowest = -min
      const highest = 9 - max
      if (highest < lowest) continue
      const x = lowest + Math.floor(random() * (highest - lowest + 1))
      const columns = footprint(id, rotation, x)
      if (columns.some((column) => wellColumns.has(column))) continue
      // Keep the decoy near the middle-left of the skyline so the wells stay readable.
      sequence.push(id)
      solution.push({ rotation, x })
      placed = true
    }
  }

  // The solution: one vertical I per well slot, band by band.
  for (let band = 0; band < bands; band += 1) {
    for (const well of wells) {
      for (let offset = 0; offset < well.width; offset += 1) {
        const column = well.base + offset
        sequence.push('I')
        solution.push({ rotation: 1, x: column - 2 })
      }
    }
  }

  return { board, sequence, solution, linesTarget: height, bands }
}

/** Replay the stored solution through the shipped engine. */
export function replaySolution(level: PuzzleLevel): boolean {
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
    if (engine.status !== 'playing') return false
    const action = level.solution[index]
    if (!action) return false
    if (!engine.setActive(level.sequence[index]!, action.rotation, action.x, 0)) return false
    engine.hardDrop()
    // Resolve the short clear window and the next spawn without letting gravity
    // move the next candidate before we place it.
    for (let tick = 0; tick < 6; tick += 1) engine.update(5)
  }
  return engine.status === 'won' && engine.lines >= level.linesTarget
}

function buildLevel(world: number, index: number): PuzzleLevel {
  const baseSeed = world * 100_000 + index * 977
  // Level one teaches the well with a single I piece; from level two on the
  // sequence carries coloured decoys so the early game is not fifty levels of
  // one pale piece.
  const decoyWave =
    world === 1
      ? index <= 1
        ? 0
        : index <= 20
          ? 1
          : index <= 35
            ? 2
            : 3
      : Math.min(5, Math.floor(world / 2) + (index > 30 ? 1 : 0))
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const decoys = attempt === 0 ? decoyWave : Math.max(0, decoyWave - Math.floor(attempt / 3))
    const candidate = makeCandidate(world, index, decoys, baseSeed + attempt * 7919)
    const times = puzzleTimes(candidate.sequence.length)
    const level: PuzzleLevel = {
      id: `w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`,
      world,
      index,
      name: `${WORLDS[world - 1]!.name} ${String(index).padStart(2, '0')}`,
      board: candidate.board,
      sequence: candidate.sequence,
      linesTarget: candidate.linesTarget,
      goldMs: times.goldMs,
      parMs: times.parMs,
      solution: candidate.solution,
    }
    if (replaySolution(level)) return level
  }
  // Guaranteed fallback: a single band with a single well and no decoys.
  const fallback = makeCandidate(world, 1, 0, baseSeed + 555)
  const times = puzzleTimes(fallback.sequence.length)
  return {
    id: `w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`,
    world,
    index,
    name: `${WORLDS[world - 1]!.name} ${String(index).padStart(2, '0')}`,
    board: fallback.board,
    sequence: fallback.sequence,
    linesTarget: fallback.linesTarget,
    goldMs: times.goldMs,
    parMs: times.parMs,
    solution: fallback.solution,
  }
}

async function main(): Promise<void> {
  const levels: PuzzleLevel[] = []
  for (let world = 1; world <= WORLDS.length; world += 1) {
    for (let index = 1; index <= LEVELS_PER_WORLD; index += 1) {
      const level = buildLevel(world, index)
      if (!replaySolution(level)) throw new Error(`unvalidated level ${level.id}`)
      levels.push(level)
    }
  }
  const file: LevelFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    levels,
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(file), 'utf8')
  const decoys = levels.map((level) => level.sequence.length - level.linesTarget / 4).reduce((a, b) => a + b, 0)
  console.log(`wrote ${levels.length} levels (${TOTAL} requested, ${decoys} decoy placements)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
