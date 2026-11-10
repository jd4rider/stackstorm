/*
 * Journey level builder.
 *
 * A Journey level is an endless score chase, not a three-move puzzle. The
 * player gets the normal seven-bag queue, keeps playing until the stack tops
 * out, and clears the level by reaching the score target before that happens.
 *
 * Every board is a stone wall (one to three bands of four rows) with one or two
 * wells carved through it. Filling a well with vertical I pieces clears a whole
 * band, which is where the score comes from. The builder proves the geometry by
 * actually clearing every board through the shipped engine, and the target
 * maths lives in src/puzzles/levelGeometry.ts so the tests can re-derive it.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORLDS } from '../src/data/worlds'
import { makeRng } from '../src/engine/rng'
import { BAND_VALUE, targetsFor, wallClearLines } from '../src/puzzles/levelGeometry'
import type { LevelFile, PuzzleLevel } from '../src/puzzles/types'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'src', 'puzzles', 'levels.json')
const LEVELS_PER_WORLD = 50

interface Well {
  base: number
  width: number
}

function emptyBoard(): number[][] {
  return Array.from({ length: 20 }, () => Array<number>(10).fill(0))
}

function buildBoard(bands: number, wells: Well[]): number[][] {
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

function bandsFor(world: number): number {
  if (world <= 3) return 1
  if (world <= 8) return 2
  return 3
}

function wellsFor(world: number, index: number, random: () => number): Well[] {
  const wide = world >= 4 && index > 12
  const twoWells = world >= 6 && index > 25
  const width = wide ? 2 : 1
  const wells: Well[] = []
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
      secondBase =
        wells[0]!.base + width + 2 < 10 - secondWidth
          ? wells[0]!.base + width + 2
          : wells[0]!.base - secondWidth - 2
    }
    secondBase = Math.max(0, Math.min(10 - secondWidth, secondBase))
    if (Math.abs(secondBase - wells[0]!.base) >= width + secondWidth) {
      wells.push({ base: secondBase, width: secondWidth })
    }
  }
  return wells
}

function buildLevel(world: number, index: number): PuzzleLevel {
  const random = makeRng(world * 100_000 + index * 977)
  const bands = bandsFor(world)
  const board = buildBoard(bands, wellsFor(world, index, random))
  return {
    id: `w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`,
    world,
    index,
    name: `${WORLDS[world - 1]!.name} ${String(index).padStart(2, '0')}`,
    board,
    bands,
    ...targetsFor(bands, index),
  }
}

async function main(): Promise<void> {
  const levels: PuzzleLevel[] = []
  for (let world = 1; world <= WORLDS.length; world += 1) {
    for (let index = 1; index <= LEVELS_PER_WORLD; index += 1) {
      const level = buildLevel(world, index)
      const cleared = wallClearLines(level)
      if (cleared !== level.bands * 4) {
        throw new Error(`${level.id}: wall cleared ${cleared} lines, expected ${level.bands * 4}`)
      }
      if (level.scoreTarget < BAND_VALUE * level.bands) {
        throw new Error(`${level.id}: target ${level.scoreTarget} is below the wall value`)
      }
      levels.push(level)
    }
  }
  const file: LevelFile = { version: 2, generatedAt: new Date().toISOString(), levels }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(file), 'utf8')
  const targets = levels.map((level) => level.scoreTarget)
  console.log(
    `wrote ${levels.length} levels · targets ${Math.min(...targets)}–${Math.max(...targets)} · bands ${levels[0]!.bands}–${levels[levels.length - 1]!.bands}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
