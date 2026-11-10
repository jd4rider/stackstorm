import { ACHIEVEMENTS } from './achievements'
import { THEMES, DEFAULT_THEME_ID } from '../config/themes'
import type { GameMode } from '../engine/types'
import { globalIndexFor, TOTAL_LEVELS } from '../puzzles/levels'
import type { PuzzleLevel } from '../puzzles/types'

export type Quality = 'low' | 'medium' | 'high'

export interface Settings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  muted: boolean
  quality: Quality
  reducedMotion: boolean
  highContrast: boolean
  ghost: boolean
  shake: boolean
  themeId: string
  dasMs: number
  arrMs: number
  touchButtons: boolean
  gestures: boolean
  tutorialSeen: boolean
}

export interface JourneyProgress {
  unlocked: number
  stars: Record<string, number>
  bestMs: Record<string, number>
}

export interface BestScores {
  marathon: number
  storm: number
  timeattack: number
  sprintMs: number
}

export interface PlayerStats {
  games: number
  lines: number
  pieces: number
  fourLines: number
  tspins: number
  maxCombo: number
  playMs: number
  storms: number
  perfectClears: number
  journeyLevels: number
  stars: number
}

export interface Progress {
  version: number
  settings: Settings
  journey: JourneyProgress
  best: BestScores
  achievements: string[]
  stats: PlayerStats
}

export interface SaveStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export const SAVE_VERSION = 1
export const STORAGE_KEY = 'stackstorm-save-v1'

function memoryStore(): SaveStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

const fallback = memoryStore()

export function defaultStore(): SaveStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__stackstorm_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    }
  } catch {
    // Private mode: the session still plays with an in-memory store.
  }
  return fallback
}

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.45,
    sfxVolume: 0.8,
    muted: false,
    quality: 'high',
    reducedMotion: false,
    highContrast: false,
    ghost: true,
    shake: true,
    themeId: DEFAULT_THEME_ID,
    dasMs: 150,
    arrMs: 30,
    touchButtons: true,
    gestures: false,
    tutorialSeen: false,
  }
}

export function defaultProgress(): Progress {
  return {
    version: SAVE_VERSION,
    settings: defaultSettings(),
    journey: { unlocked: 1, stars: {}, bestMs: {} },
    best: { marathon: 0, storm: 0, timeattack: 0, sprintMs: 0 },
    achievements: [],
    stats: {
      games: 0,
      lines: 0,
      pieces: 0,
      fourLines: 0,
      tspins: 0,
      maxCombo: 0,
      playMs: 0,
      storms: 0,
      perfectClears: 0,
      journeyLevels: 0,
      stars: 0,
    },
  }
}

const clampNumber = (value: unknown, min: number, max: number, fallbackValue: number): number => {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallbackValue
  return Math.min(max, Math.max(min, number))
}

const bool = (value: unknown, fallbackValue: boolean): boolean =>
  typeof value === 'boolean' ? value : fallbackValue

const string = (value: unknown, fallbackValue: string): string =>
  typeof value === 'string' ? value : fallbackValue

const themeIds = new Set(THEMES.map((theme) => theme.id))

export function sanitizeProgress(raw: unknown): Progress {
  const clean = defaultProgress()
  if (!raw || typeof raw !== 'object') return clean
  const value = raw as Record<string, unknown>

  if (value.settings && typeof value.settings === 'object') {
    const settings = value.settings as Record<string, unknown>
    const quality = settings.quality
    clean.settings = {
      masterVolume: clampNumber(settings.masterVolume, 0, 1, 0.8),
      musicVolume: clampNumber(settings.musicVolume, 0, 1, 0.45),
      sfxVolume: clampNumber(settings.sfxVolume, 0, 1, 0.8),
      muted: bool(settings.muted, false),
      quality: quality === 'low' || quality === 'medium' || quality === 'high' ? quality : 'high',
      reducedMotion: bool(settings.reducedMotion, false),
      highContrast: bool(settings.highContrast, false),
      ghost: bool(settings.ghost, true),
      shake: bool(settings.shake, true),
      themeId: themeIds.has(string(settings.themeId, DEFAULT_THEME_ID))
        ? string(settings.themeId, DEFAULT_THEME_ID)
        : DEFAULT_THEME_ID,
      dasMs: clampNumber(settings.dasMs, 60, 300, 150),
      arrMs: clampNumber(settings.arrMs, 0, 100, 30),
      touchButtons: bool(settings.touchButtons, true),
      gestures: bool(settings.gestures, false),
      tutorialSeen: bool(settings.tutorialSeen, false),
    }
  }

  if (value.journey && typeof value.journey === 'object') {
    const journey = value.journey as Record<string, unknown>
    clean.journey.unlocked = Math.round(clampNumber(journey.unlocked, 1, TOTAL_LEVELS, 1))
    if (journey.stars && typeof journey.stars === 'object') {
      for (const [id, stars] of Object.entries(journey.stars as Record<string, unknown>)) {
        if (!/^w\d{2}-\d{2}$/.test(id)) continue
        const count = Math.round(clampNumber(stars, 0, 3, 0))
        if (count > 0) clean.journey.stars[id] = count
      }
    }
    if (journey.bestMs && typeof journey.bestMs === 'object') {
      for (const [id, ms] of Object.entries(journey.bestMs as Record<string, unknown>)) {
        if (!/^w\d{2}-\d{2}$/.test(id)) continue
        const time = Math.round(clampNumber(ms, 0, 3_600_000, 0))
        if (time > 0) clean.journey.bestMs[id] = time
      }
    }
  }

  if (value.best && typeof value.best === 'object') {
    const best = value.best as Record<string, unknown>
    clean.best = {
      marathon: Math.round(clampNumber(best.marathon, 0, 100_000_000, 0)),
      storm: Math.round(clampNumber(best.storm, 0, 100_000_000, 0)),
      timeattack: Math.round(clampNumber(best.timeattack, 0, 100_000_000, 0)),
      sprintMs: Math.round(clampNumber(best.sprintMs, 0, 3_600_000, 0)),
    }
  }

  if (Array.isArray(value.achievements)) {
    clean.achievements = [...new Set(value.achievements.filter((id): id is string => typeof id === 'string'))]
  }

  if (value.stats && typeof value.stats === 'object') {
    const stats = value.stats as Record<string, unknown>
    clean.stats = {
      games: Math.round(clampNumber(stats.games, 0, 1_000_000, 0)),
      lines: Math.round(clampNumber(stats.lines, 0, 10_000_000, 0)),
      pieces: Math.round(clampNumber(stats.pieces, 0, 100_000_000, 0)),
      fourLines: Math.round(clampNumber(stats.fourLines, 0, 1_000_000, 0)),
      tspins: Math.round(clampNumber(stats.tspins, 0, 1_000_000, 0)),
      maxCombo: Math.round(clampNumber(stats.maxCombo, 0, 10_000, 0)),
      playMs: Math.round(clampNumber(stats.playMs, 0, 10_000_000_000, 0)),
      storms: Math.round(clampNumber(stats.storms, 0, 1_000_000, 0)),
      perfectClears: Math.round(clampNumber(stats.perfectClears, 0, 1_000_000, 0)),
      journeyLevels: Math.round(clampNumber(stats.journeyLevels, 0, TOTAL_LEVELS, 0)),
      stars: Math.round(clampNumber(stats.stars, 0, TOTAL_LEVELS * 3, 0)),
    }
  }

  return clean
}

export function loadProgress(store: SaveStore = defaultStore()): Progress {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    return sanitizeProgress(JSON.parse(raw))
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(progress: Progress, store: SaveStore = defaultStore()): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // A full quota must never end the session.
  }
}

/** Conservative merge: best scores, fewest sprint milliseconds, union of unlocks. */
export function mergeProgress(local: Progress, cloud: Progress): Progress {
  const merged = sanitizeProgress(local)
  merged.best = {
    marathon: Math.max(merged.best.marathon, cloud.best.marathon),
    storm: Math.max(merged.best.storm, cloud.best.storm),
    timeattack: Math.max(merged.best.timeattack, cloud.best.timeattack),
    sprintMs:
      merged.best.sprintMs <= 0
        ? cloud.best.sprintMs
        : cloud.best.sprintMs <= 0
          ? merged.best.sprintMs
          : Math.min(merged.best.sprintMs, cloud.best.sprintMs),
  }
  merged.journey.unlocked = Math.max(merged.journey.unlocked, cloud.journey.unlocked)
  for (const [id, stars] of Object.entries(cloud.journey.stars)) {
    merged.journey.stars[id] = Math.max(merged.journey.stars[id] ?? 0, stars)
  }
  for (const [id, ms] of Object.entries(cloud.journey.bestMs)) {
    const current = merged.journey.bestMs[id]
    merged.journey.bestMs[id] = current === undefined ? ms : Math.min(current, ms)
  }
  merged.achievements = [...new Set([...merged.achievements, ...cloud.achievements])]
  merged.stats = {
    games: Math.max(merged.stats.games, cloud.stats.games),
    lines: Math.max(merged.stats.lines, cloud.stats.lines),
    pieces: Math.max(merged.stats.pieces, cloud.stats.pieces),
    fourLines: Math.max(merged.stats.fourLines, cloud.stats.fourLines),
    tspins: Math.max(merged.stats.tspins, cloud.stats.tspins),
    maxCombo: Math.max(merged.stats.maxCombo, cloud.stats.maxCombo),
    playMs: Math.max(merged.stats.playMs, cloud.stats.playMs),
    storms: Math.max(merged.stats.storms, cloud.stats.storms),
    perfectClears: Math.max(merged.stats.perfectClears, cloud.stats.perfectClears),
    journeyLevels: Math.max(merged.stats.journeyLevels, cloud.stats.journeyLevels),
    stars: Math.max(merged.stats.stars, cloud.stats.stars),
  }
  return merged
}

export function evaluateAchievements(progress: Progress): string[] {
  const unlocked: string[] = []
  for (const achievement of ACHIEVEMENTS) {
    if (progress.achievements.includes(achievement.id)) continue
    if (achievement.check(progress)) {
      progress.achievements.push(achievement.id)
      unlocked.push(achievement.id)
    }
  }
  return unlocked
}

export interface RunSummary {
  mode: GameMode
  score: number
  lines: number
  level: number
  pieces: number
  fourLines: number
  tspins: number
  maxCombo: number
  elapsedMs: number
  perfectClears: number
  storms: number
}

export function recordRun(progress: Progress, run: RunSummary): Progress {
  const next = sanitizeProgress(progress)
  if (run.mode === 'marathon') next.best.marathon = Math.max(next.best.marathon, run.score)
  if (run.mode === 'storm') next.best.storm = Math.max(next.best.storm, run.score)
  if (run.mode === 'timeattack') next.best.timeattack = Math.max(next.best.timeattack, run.score)
  if (run.mode === 'sprint' && run.lines >= 40) {
    next.best.sprintMs =
      next.best.sprintMs <= 0 ? Math.round(run.elapsedMs) : Math.min(next.best.sprintMs, Math.round(run.elapsedMs))
  }
  next.stats.games += 1
  next.stats.lines += run.lines
  next.stats.pieces += run.pieces
  next.stats.fourLines += run.fourLines
  next.stats.tspins += run.tspins
  next.stats.maxCombo = Math.max(next.stats.maxCombo, run.maxCombo)
  next.stats.playMs += Math.round(run.elapsedMs)
  next.stats.perfectClears += run.perfectClears
  next.stats.storms += run.storms
  evaluateAchievements(next)
  saveProgress(next)
  return next
}

export interface JourneyRunSummary {
  stars: number
  elapsedMs: number
  score: number
  lines: number
  pieces: number
}

export function recordJourneyLevel(progress: Progress, level: PuzzleLevel, run: JourneyRunSummary): Progress {
  const next = sanitizeProgress(progress)
  next.journey.stars[level.id] = Math.max(next.journey.stars[level.id] ?? 0, run.stars)
  const previous = next.journey.bestMs[level.id]
  next.journey.bestMs[level.id] =
    previous === undefined ? Math.round(run.elapsedMs) : Math.min(previous, Math.round(run.elapsedMs))
  const global = globalIndexFor(level)
  next.journey.unlocked = Math.max(next.journey.unlocked, Math.min(TOTAL_LEVELS, global + 1))
  next.stats.journeyLevels = Object.keys(next.journey.stars).length
  next.stats.stars = Object.values(next.journey.stars).reduce((sum, value) => sum + value, 0)
  // Journey runs also add to the lifetime line/piece totals.
  next.stats.games += 1
  next.stats.lines += run.lines
  next.stats.pieces += run.pieces
  evaluateAchievements(next)
  saveProgress(next)
  return next
}

export function updateSettings(progress: Progress, patch: Partial<Settings>): Progress {
  const next = sanitizeProgress(progress)
  next.settings = { ...next.settings, ...patch }
  saveProgress(next)
  return next
}

export function totalStars(progress: Progress): number {
  return Object.values(progress.journey.stars).reduce((sum, value) => sum + value, 0)
}

export function isThemeUnlocked(themeId: string, progress: Progress): boolean {
  const theme = THEMES.find((candidate) => candidate.id === themeId)
  if (!theme) return false
  return totalStars(progress) >= theme.starsRequired
}
