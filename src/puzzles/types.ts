export interface PuzzleLevel {
  id: string
  world: number
  index: number
  name: string
  /** Twenty visible rows of 0 (empty) or 8 (stone). */
  board: number[][]
  /** Four-row stone bands the level starts with. */
  bands: number
  /** Reach this score before topping out to clear the level. */
  scoreTarget: number
  twoStarScore: number
  threeStarScore: number
}

export interface LevelFile {
  version: number
  generatedAt: string
  levels: PuzzleLevel[]
}
