import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { ACHIEVEMENTS } from '../core/achievements'
import { loadProgress } from '../core/saves'
import { backdrop, fadeIn, fadeTo, header, label, panel, stage, DESIGN_W, DESIGN_H } from './common'

export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements')
  }

  create(): void {
    const progress = loadProgress()
    const theme = themeById(progress.settings.themeId)
    const unlocked = new Set(progress.achievements)
    backdrop(this, theme)
    const root = stage(this)
    header(
      this,
      root,
      'TROPHIES',
      () => fadeTo(this, 'Menu'),
      theme,
      `${unlocked.size}/${ACHIEVEMENTS.length}`,
    )

    const rowHeight = 66
    const startY = 92
    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = startY + index * rowHeight
      const earned = unlocked.has(achievement.id)
      const card = panel(this, 28, y, DESIGN_W - 56, 58, {
        fill: earned ? 0x172612 : 0x0d1730,
        side: 0x05080f,
        raised: 2,
        radius: 14,
        shadow: false,
        stroke: earned ? 0x86efac : 0xffffff,
        strokeAlpha: earned ? 0.35 : 0.08,
      })
      root.add(card)
      root.add(
        label(this, 50, y + 16, achievement.glyph, 22, earned ? theme.ui.accent : theme.ui.muted, {
          origin: 0.5,
          fontStyle: 'bold',
        }),
      )
      root.add(
        label(this, 74, y + 10, achievement.name.toUpperCase(), 12, earned ? theme.ui.text : theme.ui.muted, {
          fontStyle: 'bold',
          letterSpacing: 0.8,
        }),
      )
      root.add(label(this, 74, y + 30, achievement.description, 10, earned ? theme.ui.muted : '#68718b'))
      root.add(
        label(this, DESIGN_W - 48, y + 29, earned ? '\u2713' : '\u00B7', 18, earned ? '#86efac' : '#3d4762', {
          origin: 0.5,
          fontStyle: 'bold',
        }),
      )
    })

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 34, 'TROPHIES ARE COSMETIC AND STORED IN YOUR SAVE.', 9, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.2,
      }),
    )
    fadeIn(this)
  }
}
