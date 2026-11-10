import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { sound } from '../core/audio'
import { ACHIEVEMENTS } from '../core/achievements'
import { loadProgress } from '../core/saves'
import { levelById } from '../puzzles/levels'
import type { RunOutcome } from './GameScene'
import {
  ambientBlocks,
  backdrop,
  button,
  display,
  fadeIn,
  fadeTo,
  formatClock,
  formatNumber,
  label,
  panel,
  stage,
  starRow,
  DESIGN_W,
  DESIGN_H,
} from './common'

export class ResultsScene extends Phaser.Scene {
  private outcome!: RunOutcome

  constructor() {
    super('Results')
  }

  create(data: RunOutcome): void {
    this.outcome = data
    const progress = loadProgress()
    const theme = themeById(progress.settings.themeId)
    sound.setMusicMode('results')
    sound.setVolumes(
      progress.settings.masterVolume,
      progress.settings.musicVolume,
      progress.settings.sfxVolume,
      progress.settings.muted,
    )
    sound.setMusicWanted(progress.settings.musicVolume > 0 && !progress.settings.muted)

    backdrop(this, theme)
    const root = stage(this)
    ambientBlocks(this, root, theme, 10)

    const isPuzzle = data.mode === 'puzzle'
    const title = isPuzzle
      ? data.won
        ? 'LEVEL CLEAR'
        : 'LEVEL INCOMPLETE'
      : data.won
        ? 'RUN COMPLETE'
        : 'STACK OVERFLOW'
    const subtitle = isPuzzle
      ? data.levelName ?? 'PUZZLE JOURNEY'
      : data.mode === 'sprint'
        ? data.won
          ? 'FORTY LINES. CLOCK STOPPED.'
          : 'FORTY LINES. NOT QUITE THIS TIME.'
        : data.mode === 'timeattack'
          ? 'TWO MINUTES ON THE CLOCK'
          : data.mode === 'storm'
            ? 'THE STORM REMEMBERS EVERY LINE'
            : 'EVERY TEN LINES RAISES THE LEVEL'

    root.add(
      label(this, DESIGN_W / 2, 74, isPuzzle ? 'PUZZLE JOURNEY' : 'STACKSTORM', 12, theme.ui.accent, {
        origin: 0.5,
        letterSpacing: 3.4,
        fontStyle: 'bold',
      }),
    )
    root.add(display(this, DESIGN_W / 2, 132, title, 48, data.won ? theme.ui.text : theme.ui.muted, 0.5))
    root.add(label(this, DESIGN_W / 2, 176, subtitle, 11, theme.ui.muted, { origin: 0.5, letterSpacing: 1.4 }))

    const card = panel(this, 60, 218, DESIGN_W - 120, isPuzzle ? 388 : 360, {
      fill: 0x0b1428,
      side: 0x05080f,
      raised: 6,
      radius: 28,
      stroke: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
      strokeAlpha: 0.25,
    })
    root.add(card)

    if (isPuzzle) {
      if (data.won) {
        root.add(starRow(this, DESIGN_W / 2, 292, data.stars, 46, 3, true))
        root.add(
          label(this, DESIGN_W / 2, 340, data.newBest ? 'NEW BEST RATING' : `BEST ${data.previousStars} STAR${data.previousStars === 1 ? '' : 'S'}`, 11, data.newBest ? theme.ui.accent : theme.ui.muted, {
            origin: 0.5,
            fontStyle: 'bold',
            letterSpacing: 1.4,
          }),
        )
      } else {
        root.add(display(this, DESIGN_W / 2, 306, `${data.lines}/${levelById(data.levelId ?? '')?.linesTarget ?? 0}`, 44, theme.ui.text, 0.5))
        root.add(label(this, DESIGN_W / 2, 342, 'LINES CLEARED', 11, theme.ui.muted, { origin: 0.5, letterSpacing: 1.4 }))
      }
      this.statRow(root, 276, 'TIME', formatClock(data.elapsedMs), theme)
      this.statRow(root, 316, 'PIECES PLACED', `${data.pieces}`, theme)
      this.statRow(root, 356, 'BEST COMBO', `×${data.maxCombo}`, theme)
      this.statRow(root, 396, 'FOUR-LINE CLEARS', `${data.fourLines}`, theme)
    } else {
      const bigValue =
        data.mode === 'sprint' && data.won
          ? formatClock(data.elapsedMs)
          : formatNumber(data.score)
      const valueText = display(this, DESIGN_W / 2, 300, data.mode === 'sprint' && data.won ? bigValue : '0', 52, theme.ui.text, 0.5)
      root.add(valueText)
      root.add(
        label(
          this,
          DESIGN_W / 2,
          346,
          data.mode === 'sprint' && data.won ? 'FINAL TIME' : 'FINAL SCORE',
          11,
          theme.ui.muted,
          { origin: 0.5, letterSpacing: 2 },
        ),
      )
      if (data.mode !== 'sprint' || !data.won) {
        this.countUp(valueText, data.score, 900)
      }
      if (data.newBest) {
        const badge = panel(this, DESIGN_W / 2 - 62, 366, 124, 30, {
          fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
          side: 0x05080f,
          raised: 2,
          radius: 15,
          highlight: false,
        })
        root.add(badge)
        root.add(label(this, DESIGN_W / 2, 381, 'NEW BEST', 11, '#061018', { origin: 0.5, fontStyle: 'bold', letterSpacing: 1.2 }))
      }
      this.statRow(root, 424, 'LINES', `${data.lines}`, theme)
      this.statRow(root, 460, 'LEVEL', `${data.level}`, theme)
      this.statRow(root, 496, 'BEST COMBO', `×${data.maxCombo}`, theme)
      this.statRow(root, 532, 'TIME', formatClock(data.elapsedMs), theme)
    }

    if (data.newAchievements.length > 0) {
      const names = data.newAchievements
        .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id)?.name)
        .filter((name): name is string => Boolean(name))
      const badgePanel = panel(this, 60, 632, DESIGN_W - 120, Math.min(140, 48 + names.length * 26), {
        fill: 0x2a2310,
        side: 0x100d05,
        raised: 3,
        radius: 18,
        stroke: 0xfbbf24,
        strokeAlpha: 0.4,
      })
      root.add(badgePanel)
      root.add(label(this, 86, 650, '\u2605 TROPHY UNLOCKED', 10, '#fbbf24', { fontStyle: 'bold', letterSpacing: 1.2 }))
      names.slice(0, 3).forEach((name, index) => {
        root.add(label(this, 86, 676 + index * 24, name, 13, theme.ui.text, { fontStyle: 'bold' }))
      })
    }

    const actionsY = data.newAchievements.length > 0 ? 850 : 700
    const actionWidth = 300
    const actionX = (DESIGN_W - actionWidth) / 2

    if (isPuzzle) {
      if (data.won && data.nextLevelId) {
        root.add(
          button(this, actionX, actionsY, actionWidth, 60, 'NEXT LEVEL', () => this.startLevel(data.nextLevelId!), {
            fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
            textColor: '#061018',
            size: 19,
            glow: true,
          }),
        )
        root.add(
          button(this, actionX, actionsY + 72, actionWidth, 54, 'REPLAY', () => this.startLevel(data.levelId ?? data.nextLevelId ?? ''), {
            fill: 0x233256,
            size: 16,
          }),
        )
        root.add(
          button(this, actionX, actionsY + 138, actionWidth, 54, 'JOURNEY MAP', () => fadeTo(this, 'Journey', { world: levelById(data.levelId ?? '')?.world }), {
            fill: 0x1a2438,
            size: 16,
          }),
        )
      } else {
        root.add(
          button(this, actionX, actionsY, actionWidth, 60, 'RETRY', () => this.startLevel(data.levelId ?? ''), {
            fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
            textColor: '#061018',
            size: 19,
            glow: true,
          }),
        )
        root.add(
          button(this, actionX, actionsY + 72, actionWidth, 54, 'JOURNEY MAP', () => fadeTo(this, 'Journey', { world: levelById(data.levelId ?? '')?.world }), {
            fill: 0x233256,
            size: 16,
          }),
        )
      }
    } else {
      root.add(
        button(this, actionX, actionsY, actionWidth, 60, 'PLAY AGAIN', () => this.replay(), {
          fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
          textColor: '#061018',
          size: 19,
          glow: true,
        }),
      )
      root.add(
        button(this, actionX, actionsY + 72, actionWidth, 54, 'MAIN MENU', () => fadeTo(this, 'Menu'), {
          fill: 0x233256,
          size: 16,
        }),
      )
    }

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 42, 'STACKSTORM · LITTLE JOY ARCADE', 9, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.6,
        alpha: 0.7,
      }),
    )

    if (data.won && !progress.settings.reducedMotion) {
      for (let index = 0; index < 16; index += 1) {
        const dot = this.add.rectangle(
          DESIGN_W / 2 + (Math.random() - 0.5) * 520,
          220 + Math.random() * 320,
          6,
          6,
          [0x67f6ff, 0xffd166, 0xa855f7, 0x34d399][index % 4],
          0.9,
        )
        root.add(dot)
        this.tweens.add({
          targets: dot,
          y: dot.y - 180 - Math.random() * 220,
          alpha: 0,
          angle: 180,
          duration: 1400 + Math.random() * 900,
          delay: index * 70,
          onComplete: () => dot.destroy(),
        })
      }
    }

    fadeIn(this)
  }

  private statRow(root: Phaser.GameObjects.Container, y: number, name: string, value: string, theme: ReturnType<typeof themeById>): void {
    root.add(label(this, 92, y, name, 12, theme.ui.muted, { fontStyle: 'bold', letterSpacing: 1 }))
    root.add(label(this, DESIGN_W - 92, y, value, 13, theme.ui.text, { origin: [1, 0], fontStyle: 'bold' }))
    const line = this.add.rectangle(DESIGN_W / 2, y + 22, DESIGN_W - 184, 1, 0xffffff, 0.08)
    root.add(line)
  }

  private countUp(text: Phaser.GameObjects.Text, target: number, duration: number): void {
    const counter = { value: 0 }
    this.tweens.add({
      targets: counter,
      value: target,
      duration,
      ease: 'Cubic.Out',
      onUpdate: () => text.setText(formatNumber(counter.value)),
    })
  }

  private replay(): void {
    sound.click()
    this.scene.start('Game', { mode: this.outcome.mode, seed: (Date.now() & 0x7fffffff) ^ 0x2545f491 })
  }

  private startLevel(levelId: string): void {
    sound.click()
    this.scene.start('Game', { mode: 'puzzle', levelId, seed: (Date.now() & 0x7fffffff) ^ 0x2545f491 })
  }
}
