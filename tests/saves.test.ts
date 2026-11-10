import { describe, expect, it } from 'vitest'
import {
  defaultProgress,
  mergeProgress,
  recordJourneyLevel,
  recordRun,
  sanitizeProgress,
  updateSettings,
} from '../src/core/saves'
import { levelAt } from '../src/puzzles/levels'

describe('save data', () => {
  it('rebuilds a clean save from hostile input', () => {
    const progress = sanitizeProgress({
      version: 99,
      settings: { masterVolume: 4, dasMs: -10, quality: 'ultra', themeId: 'nope', muted: 'yes' },
      journey: { unlocked: 9999, stars: { 'w01-01': 9, bad: 3 } },
      best: { marathon: -5, sprintMs: Infinity },
      achievements: ['first_steps', 'first_steps', 12],
      stats: { lines: -3, maxCombo: 'x' },
    })
    expect(progress.settings.masterVolume).toBe(1)
    expect(progress.settings.dasMs).toBe(60)
    expect(progress.settings.quality).toBe('high')
    expect(progress.settings.themeId).toBe('neon')
    expect(progress.settings.muted).toBe(false)
    expect(progress.journey.unlocked).toBe(500)
    expect(progress.journey.stars['w01-01']).toBe(3)
    expect(progress.journey.stars.bad).toBeUndefined()
    expect(progress.best.marathon).toBe(0)
    expect(progress.best.sprintMs).toBe(0)
    expect(progress.achievements).toEqual(['first_steps'])
    expect(progress.stats.lines).toBe(0)
    expect(progress.stats.maxCombo).toBe(0)
  })

  it('records a run without ever lowering a personal best', () => {
    let progress = defaultProgress()
    progress = recordRun(progress, {
      mode: 'marathon',
      score: 12_000,
      lines: 42,
      level: 5,
      pieces: 90,
      fourLines: 1,
      tspins: 0,
      maxCombo: 3,
      elapsedMs: 90_000,
      perfectClears: 0,
      storms: 0,
    })
    expect(progress.best.marathon).toBe(12_000)
    progress = recordRun(progress, {
      mode: 'marathon',
      score: 4_000,
      lines: 10,
      level: 2,
      pieces: 30,
      fourLines: 0,
      tspins: 0,
      maxCombo: 1,
      elapsedMs: 30_000,
      perfectClears: 0,
      storms: 0,
    })
    expect(progress.best.marathon).toBe(12_000)
    expect(progress.stats.games).toBe(2)
    expect(progress.stats.lines).toBe(52)
  })

  it('keeps the fastest sprint and only records completed sprints', () => {
    let progress = defaultProgress()
    progress = recordRun(progress, {
      mode: 'sprint',
      score: 0,
      lines: 40,
      level: 1,
      pieces: 100,
      fourLines: 2,
      tspins: 0,
      maxCombo: 4,
      elapsedMs: 90_000,
      perfectClears: 0,
      storms: 0,
    })
    progress = recordRun(progress, {
      mode: 'sprint',
      score: 0,
      lines: 39,
      level: 1,
      pieces: 100,
      fourLines: 2,
      tspins: 0,
      maxCombo: 4,
      elapsedMs: 30_000,
      perfectClears: 0,
      storms: 0,
    })
    expect(progress.best.sprintMs).toBe(90_000)
  })

  it('unlocks the next level and totals stars', () => {
    let progress = defaultProgress()
    const level = levelAt(1)!
    progress = recordJourneyLevel(progress, level, { stars: 2, elapsedMs: 12_000, score: 1_500, lines: 8, pieces: 40 })
    expect(progress.journey.unlocked).toBe(2)
    expect(progress.journey.stars[level.id]).toBe(2)
    expect(progress.stats.stars).toBe(2)
    expect(progress.stats.journeyLevels).toBe(1)
    // A worse replay cannot lower the saved rating or best time.
    progress = recordJourneyLevel(progress, level, { stars: 1, elapsedMs: 20_000, score: 900, lines: 4, pieces: 25 })
    expect(progress.journey.stars[level.id]).toBe(2)
    expect(progress.journey.bestMs[level.id]).toBe(12_000)
  })

  it('merges local and cloud progress conservatively', () => {
    const local = defaultProgress()
    local.best.marathon = 5_000
    local.best.sprintMs = 100_000
    local.journey.stars['w01-01'] = 3
    local.achievements = ['first_steps']
    const cloud = defaultProgress()
    cloud.best.marathon = 9_000
    cloud.best.sprintMs = 80_000
    cloud.journey.unlocked = 12
    cloud.journey.stars['w01-02'] = 2
    cloud.achievements = ['lightning_strike']
    const merged = mergeProgress(local, cloud)
    expect(merged.best.marathon).toBe(9_000)
    expect(merged.best.sprintMs).toBe(80_000)
    expect(merged.journey.unlocked).toBe(12)
    expect(merged.journey.stars['w01-01']).toBe(3)
    expect(merged.journey.stars['w01-02']).toBe(2)
    expect(merged.achievements.sort()).toEqual(['first_steps', 'lightning_strike'])
  })

  it('updates settings without touching progress', () => {
    const progress = defaultProgress()
    const next = updateSettings(progress, { reducedMotion: true, quality: 'low', dasMs: 90 })
    expect(next.settings.reducedMotion).toBe(true)
    expect(next.settings.quality).toBe('low')
    expect(next.settings.dasMs).toBe(90)
  })
})
