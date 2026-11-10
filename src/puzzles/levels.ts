import raw from './levels.json'
import type { LevelFile, PuzzleLevel } from './types'

const file = raw as unknown as LevelFile

export const LEVELS: PuzzleLevel[] = file.levels
export const TOTAL_LEVELS = LEVELS.length
export const LEVELS_PER_WORLD = 50

const byId = new Map(LEVELS.map((level) => [level.id, level]))

export function levelById(id: string): PuzzleLevel | undefined {
  return byId.get(id)
}

export function levelAt(globalIndex: number): PuzzleLevel | undefined {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, globalIndex - 1))]
}

export function globalIndexFor(level: PuzzleLevel): number {
  return (level.world - 1) * LEVELS_PER_WORLD + level.index
}

export function levelsForWorld(world: number): PuzzleLevel[] {
  return LEVELS.filter((level) => level.world === world)
}

export function nextLevel(level: PuzzleLevel): PuzzleLevel | undefined {
  return levelAt(globalIndexFor(level) + 1)
}

export function worldForIndex(globalIndex: number): number {
  return Math.min(10, Math.floor((globalIndex - 1) / LEVELS_PER_WORLD) + 1)
}
