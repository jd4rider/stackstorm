export const LINE_POINTS = [0, 100, 300, 500, 800]
export const TSPIN_POINTS = [0, 800, 1200, 1600, 1600]
export const PERFECT_CLEAR_POINTS = [0, 800, 1200, 1800, 2000]
export const COMBO_STEP = 50

/** Gravity in milliseconds per cell for a given level (1-based). */
export function gravityForLevel(level: number): number {
  // A gentle opening: a full second per row at level 1 so the first pieces can
  // be read and placed calmly, then a steady ramp toward arcade speed.
  const table = [1000, 900, 810, 720, 630, 550, 470, 400, 340, 285, 240, 200, 170, 145, 120, 100, 85, 72, 60]
  return table[Math.min(Math.max(level, 1) - 1, table.length - 1)]!
}

/** Sprint starts at a brisk, fixed speed and never speeds up further. */
export const SPRINT_GRAVITY_MS = 550
export const TIME_ATTACK_GRAVITY_MS = 600
export const PUZZLE_GRAVITY_MS = 900

export function linePoints(lines: number, level: number, tspin: boolean, b2b: boolean, surge: boolean): number {
  const table = tspin ? TSPIN_POINTS : LINE_POINTS
  let points = (table[lines] ?? 0) * Math.max(1, level)
  if (b2b) points = Math.floor(points * 1.5)
  if (surge) points *= 2
  return points
}

export function comboPoints(combo: number, level: number, surge: boolean): number {
  if (combo < 2) return 0
  return COMBO_STEP * (combo - 1) * Math.max(1, level) * (surge ? 2 : 1)
}

export function perfectClearPoints(lines: number, level: number, surge: boolean): number {
  const points = (PERFECT_CLEAR_POINTS[lines] ?? 0) * Math.max(1, level)
  return surge ? points * 2 : points
}

/** Storm meter charge for a clear. */
export function stormCharge(lines: number, tspin: boolean, perfect: boolean): number {
  return [0, 12, 22, 34, 50][lines]! + (tspin ? 12 : 0) + (perfect ? 20 : 0)
}

export const STORM_THRESHOLD = 100
export const STORM_SURGE_MS = 12_000

/** Journey stars: one for the target, then two score tiers above it. */
export function puzzleStars(
  score: number,
  level: { scoreTarget: number; twoStarScore: number; threeStarScore: number },
): number {
  if (score >= level.threeStarScore) return 3
  if (score >= level.twoStarScore) return 2
  return 1
}
