import type { Progress } from './saves'

export interface Achievement {
  id: string
  name: string
  description: string
  glyph: string
  check: (progress: Progress) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first Journey level.',
    glyph: '\u2726',
    check: (progress) => progress.stats.journeyLevels >= 1,
  },
  {
    id: 'lightning_strike',
    name: 'Lightning Strike',
    description: 'Clear four lines at once.',
    glyph: '\u26A1',
    check: (progress) => progress.stats.fourLines >= 1,
  },
  {
    id: 'combo_starter',
    name: 'Combo Starter',
    description: 'Reach a three-clear combo.',
    glyph: '\u2739',
    check: (progress) => progress.stats.maxCombo >= 3,
  },
  {
    id: 'chain_master',
    name: 'Chain Master',
    description: 'Reach a ten-clear combo.',
    glyph: '\u267E',
    check: (progress) => progress.stats.maxCombo >= 10,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Clear Sprint in under two minutes.',
    glyph: '\u23F1',
    check: (progress) => progress.best.sprintMs > 0 && progress.best.sprintMs <= 120_000,
  },
  {
    id: 'marathon_hero',
    name: 'Marathon Hero',
    description: 'Score 100,000 in Classic Marathon.',
    glyph: '\u265B',
    check: (progress) => progress.best.marathon >= 100_000,
  },
  {
    id: 'puzzle_pioneer',
    name: 'Puzzle Pioneer',
    description: 'Complete 25 Journey levels.',
    glyph: '\u2691',
    check: (progress) => progress.stats.journeyLevels >= 25,
  },
  {
    id: 'world_conqueror',
    name: 'World Conqueror',
    description: 'Earn at least one star on all fifty levels of a world.',
    glyph: '\u2605',
    check: (progress) => {
      for (let world = 1; world <= 10; world += 1) {
        let count = 0
        for (let index = 1; index <= 50; index += 1) {
          if ((progress.journey.stars[`w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`] ?? 0) > 0) {
            count += 1
          }
        }
        if (count >= 50) return true
      }
      return false
    },
  },
  {
    id: 'storm_rider',
    name: 'Storm Rider',
    description: 'Activate Storm Surge twenty-five times.',
    glyph: '\u26C8',
    check: (progress) => progress.stats.storms >= 25,
  },
  {
    id: 'perfect_storm',
    name: 'Perfect Storm',
    description: 'Clear the board completely at least once.',
    glyph: '\u25C7',
    check: (progress) => progress.stats.perfectClears >= 1,
  },
  {
    id: 'tspin_artist',
    name: 'Spin Artist',
    description: 'Land ten T-spins.',
    glyph: '\u21BB',
    check: (progress) => progress.stats.tspins >= 10,
  },
  {
    id: 'line_keeper',
    name: 'Line Keeper',
    description: 'Clear 1,000 lines across all modes.',
    glyph: '\u2261',
    check: (progress) => progress.stats.lines >= 1_000,
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    description: 'Collect 250 Journey stars.',
    glyph: '\u2727',
    check: (progress) => progress.stats.stars >= 250,
  },
]
