import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { sound } from '../core/audio'
import { loadProgress, totalStars } from '../core/saves'
import { arcade } from '../integration/LittleJoyAdapter'
import { TOTAL_LEVELS, levelAt } from '../puzzles/levels'
import { worldForIndex } from '../puzzles/levels'
import { ambientBlocks, backdrop, button, fadeIn, fadeTo, iconButton, label, logo, stage, DESIGN_W, DESIGN_H } from './common'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const progress = loadProgress()
    const theme = themeById(progress.settings.themeId)
    sound.setVolumes(
      progress.settings.masterVolume,
      progress.settings.musicVolume,
      progress.settings.sfxVolume,
      progress.settings.muted,
    )
    sound.setMusicWanted(progress.settings.musicVolume > 0 && !progress.settings.muted)
    sound.setMusicMode('menu')

    backdrop(this, theme)
    const root = stage(this)
    ambientBlocks(this, root, theme, 14)

    root.add(
      label(this, DESIGN_W / 2, 56, 'LITTLE JOY ARCADE', 12, theme.ui.accent, {
        origin: 0.5,
        letterSpacing: 4,
        fontStyle: 'bold',
      }),
    )
    logo(this, root, DESIGN_W / 2, 124, theme, 62)
    root.add(
      label(this, DESIGN_W / 2, 184, 'STACK · SLIDE · STORM', 14, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 3,
      }),
    )

    const stars = totalStars(progress)
    const progressPill = this.add.graphics()
    progressPill.fillStyle(0xffffff, 0.06)
    progressPill.fillRoundedRect(DESIGN_W / 2 - 170, 214, 340, 34, 17)
    progressPill.lineStyle(1, 0xffffff, 0.1)
    progressPill.strokeRoundedRect(DESIGN_W / 2 - 170, 214, 340, 34, 17)
    root.add(progressPill)
    root.add(
      label(this, DESIGN_W / 2, 231, `\u2605 ${stars}   ·   JOURNEY ${Math.min(TOTAL_LEVELS, progress.journey.unlocked - 1)}/${TOTAL_LEVELS}`, 13, theme.ui.text, {
        origin: 0.5,
        fontStyle: 'bold',
        letterSpacing: 0.6,
      }),
    )

    const buttonWidth = 620
    const startY = 258
    const height = 78
    const gap = 9
    const x = (DESIGN_W - buttonWidth) / 2

    const primary = [
      {
        text: 'CONTINUE JOURNEY',
        subtitle: 'PICK UP WHERE YOU LEFT OFF',
        fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
        color: '#07101a',
        action: () => this.openJourney(),
      },
      {
        text: 'CLASSIC MARATHON',
        subtitle: 'ENDLESS · LEVELS · COMBOS',
        fill: 0x1d2b52,
        color: theme.ui.text,
        action: () => this.play('marathon'),
      },
      {
        text: 'STORM MODE',
        subtitle: 'CHARGE THE METER · DOUBLE POINTS',
        fill: 0x2a1c44,
        color: theme.ui.text,
        action: () => this.play('storm'),
      },
      {
        text: 'PUZZLE JOURNEY',
        subtitle: '500 VALIDATED LEVELS · 10 WORLDS',
        fill: 0x173a45,
        color: theme.ui.text,
        action: () => this.openJourney(),
      },
      {
        text: 'SPRINT',
        subtitle: 'FORTY LINES · BEAT THE CLOCK',
        fill: 0x3c1d2a,
        color: theme.ui.text,
        action: () => this.play('sprint'),
      },
      {
        text: 'TIME ATTACK',
        subtitle: 'TWO MINUTES · MAXIMUM SCORE',
        fill: 0x2c2a14,
        color: theme.ui.text,
        action: () => this.play('timeattack'),
      },
    ]

    primary.forEach((entry, index) => {
      const buttonNode = button(
        this,
        x,
        startY + index * (height + gap),
        buttonWidth,
        height,
        entry.text,
        entry.action,
        {
          fill: entry.fill,
          textColor: entry.color,
          size: 26,
          subtitle: entry.subtitle,
          glow: index === 0,
        },
      )
      root.add(buttonNode)
    })

    const secondaryY = startY + primary.length * (height + gap) + 20
    const iconSize = 68
    const secondary = [
      { glyph: '\u25D1', text: 'THEMES', action: () => fadeTo(this, 'Themes') },
      { glyph: '\u2605', text: 'TROPHIES', action: () => fadeTo(this, 'Achievements') },
      { glyph: '\u2261', text: 'STATS', action: () => fadeTo(this, 'Stats') },
      { glyph: '\u2699', text: 'SETTINGS', action: () => fadeTo(this, 'Settings') },
    ]
    const spacing = 108
    const secondaryX = DESIGN_W / 2 - (secondary.length - 1) * spacing / 2
    secondary.forEach((entry, index) => {
      const node = iconButton(this, secondaryX + index * spacing, secondaryY + iconSize / 2, entry.glyph, entry.action, {
        size: iconSize,
        fill: 0x17233f,
        label: entry.text,
      })
      root.add(node)
    })

    const help = label(this, DESIGN_W / 2, secondaryY + 108, 'HOW TO PLAY', 16, theme.ui.accent, {
      origin: 0.5,
      fontStyle: 'bold',
      letterSpacing: 2,
    })
    help.setInteractive({ useHandCursor: true })
    help.on('pointerup', () => fadeTo(this, 'Help'))
    root.add(help)

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 44, arcade.status(), 10, theme.ui.muted, {
        origin: 0.5,
        align: 'center',
      }),
    )
    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 24, 'v1.0.2  ·  MADE FOR LITTLE JOY ARCADE', 9, theme.ui.muted, {
        origin: 0.5,
        alpha: 0.65,
        letterSpacing: 1,
      }),
    )

    // A small animated block stack under the title.
    for (let index = 0; index < 7; index += 1) {
      const dot = this.add.rectangle(DESIGN_W / 2 - 150 + index * 50, 250, 22, 5, 0xffffff, 0.14)
      root.add(dot)
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.08, to: 0.35 },
        duration: 1200,
        delay: index * 130,
        yoyo: true,
        repeat: -1,
      })
    }

    fadeIn(this)
  }

  private play(mode: 'marathon' | 'storm' | 'sprint' | 'timeattack'): void {
    sound.select()
    fadeTo(this, 'Game', { mode })
  }

  private openJourney(): void {
    sound.select()
    const progress = loadProgress()
    const world = worldForIndex(levelAt(progress.journey.unlocked)?.world ?? 1)
    fadeTo(this, 'Journey', { world })
  }
}
