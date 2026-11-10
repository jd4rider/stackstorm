import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { ACHIEVEMENTS } from '../core/achievements'
import { formatClock, formatDuration, formatNumber, backdrop, fadeIn, fadeTo, header, label, panel, stage, DESIGN_W, DESIGN_H } from './common'
import { loadProgress, totalStars } from '../core/saves'

export class StatsScene extends Phaser.Scene {
  constructor() {
    super('Stats')
  }

  create(): void {
    const progress = loadProgress()
    const theme = themeById(progress.settings.themeId)
    backdrop(this, theme)
    const root = stage(this)
    header(this, root, 'STATISTICS', () => fadeTo(this, 'Menu'), theme, `\u2605 ${totalStars(progress)}`)

    const cards = [
      { label: 'GAMES PLAYED', value: formatNumber(progress.stats.games) },
      { label: 'LINES CLEARED', value: formatNumber(progress.stats.lines) },
      { label: 'PIECES PLACED', value: formatNumber(progress.stats.pieces) },
      { label: 'FOUR-LINE CLEARS', value: formatNumber(progress.stats.fourLines) },
      { label: 'T-SPINS', value: formatNumber(progress.stats.tspins) },
      { label: 'BEST COMBO', value: `×${progress.stats.maxCombo}` },
      { label: 'TIME PLAYED', value: formatDuration(progress.stats.playMs) },
      { label: 'STORM SURGES', value: formatNumber(progress.stats.storms) },
      { label: 'PERFECT CLEARS', value: formatNumber(progress.stats.perfectClears) },
      { label: 'JOURNEY LEVELS', value: `${progress.stats.journeyLevels}/500` },
      { label: 'STARS COLLECTED', value: formatNumber(progress.stats.stars) },
      { label: 'TROPHIES', value: `${progress.achievements.length}/${ACHIEVEMENTS.length}` },
    ]

    cards.forEach((card, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 30 + column * 342
      const y = 92 + row * 104
      const node = panel(this, x, y, 318, 92, {
        fill: 0x0d1730,
        side: 0x05080f,
        raised: 3,
        radius: 16,
        shadow: false,
        strokeAlpha: 0.1,
      })
      root.add(node)
      root.add(label(this, x + 18, y + 18, card.label, 9, theme.ui.muted, { fontStyle: 'bold', letterSpacing: 1.2 }))
      root.add(label(this, x + 18, y + 42, card.value, 24, theme.ui.text, { fontStyle: 'bold' }))
    })

    const bestY = 740
    root.add(label(this, 40, bestY, 'PERSONAL BESTS', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    const bests = [
      { label: 'CLASSIC MARATHON', value: formatNumber(progress.best.marathon) },
      { label: 'STORM MODE', value: formatNumber(progress.best.storm) },
      { label: 'TIME ATTACK', value: formatNumber(progress.best.timeattack) },
      {
        label: 'SPRINT · 40 LINES',
        value: progress.best.sprintMs > 0 ? formatClock(progress.best.sprintMs) : '—',
      },
    ]
    bests.forEach((best, index) => {
      const y = bestY + 32 + index * 52
      const row = panel(this, 30, y, DESIGN_W - 60, 42, {
        fill: 0x0d1730,
        side: 0x05080f,
        raised: 2,
        radius: 12,
        shadow: false,
        strokeAlpha: 0.08,
      })
      root.add(row)
      root.add(label(this, 48, y + 13, best.label, 10, theme.ui.muted, { fontStyle: 'bold', letterSpacing: 0.8 }))
      root.add(label(this, DESIGN_W - 48, y + 11, best.value, 14, theme.ui.text, { origin: [1, 0], fontStyle: 'bold' }))
    })

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 36, 'STATISTICS INCLUDE EVERY MODE AND JOURNEY LEVEL.', 9, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.2,
      }),
    )
    fadeIn(this)
  }
}
