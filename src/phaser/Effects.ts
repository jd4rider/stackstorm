import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import type { Quality } from '../core/saves'
import type { Cell, PieceId } from '../engine/types'
import type { GameLayout } from './layout'
import { SPARK_KEY } from './textures'

interface ClearEffect {
  rows: number[]
  lines: number
  tspin: boolean
  perfect: boolean
  combo: number
  points: number
}

export class EffectsManager {
  private readonly scene: Phaser.Scene
  private theme: Theme
  private quality: Quality
  private readonly reducedMotion: boolean
  private readonly shakeEnabled: boolean
  private readonly emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>()

  constructor(scene: Phaser.Scene, theme: Theme, quality: Quality, reducedMotion: boolean, shakeEnabled: boolean) {
    this.scene = scene
    this.theme = theme
    this.quality = quality
    this.reducedMotion = reducedMotion
    this.shakeEnabled = shakeEnabled
  }

  setTheme(theme: Theme): void {
    this.theme = theme
  }

  setQuality(quality: Quality): void {
    this.quality = quality
  }

  private count(base: number): number {
    const factor = this.quality === 'low' ? 0.4 : this.quality === 'medium' ? 0.7 : 1
    return Math.max(1, Math.round(base * factor * (this.reducedMotion ? 0.45 : 1)))
  }

  private emitter(color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const existing = this.emitters.get(color)
    if (existing) return existing
    const emitter = this.scene.add.particles(0, 0, SPARK_KEY, {
      speed: { min: 40, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 260, max: 720 },
      gravityY: 260,
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    })
    emitter.setDepth(70)
    this.emitters.set(color, emitter)
    return emitter
  }

  burst(x: number, y: number, color: number, amount: number, spread = 1): void {
    this.emitter(color).explode(this.count(amount), x, y)
    if (spread > 1) this.emitter(color).explode(this.count(amount * 0.4), x, y)
  }

  private center(layout: GameLayout, x: number, y: number, hidden: number): { px: number; py: number } {
    return {
      px: layout.boardX + x * layout.cell + layout.cell / 2,
      py: layout.boardY + (y - hidden) * layout.cell + layout.cell / 2,
    }
  }

  hardDrop(piece: PieceId, cells: Cell[], layout: GameLayout, hidden: number): void {
    if (cells.length === 0) return
    const color = this.theme.pieces[piece]
    const minX = Math.min(...cells.map((cell) => cell.x))
    const maxX = Math.max(...cells.map((cell) => cell.x))
    const maxY = Math.max(...cells.map((cell) => cell.y))
    const top = layout.boardY + 2
    const bottom = layout.boardY + (maxY - hidden + 1) * layout.cell
    const trail = this.scene.add.graphics().setDepth(60)
    trail.fillStyle(color, 0.3)
    trail.fillRoundedRect(layout.boardX + minX * layout.cell + 3, top, (maxX - minX + 1) * layout.cell - 6, Math.max(6, bottom - top), 5)
    trail.fillStyle(0xffffff, 0.4)
    trail.fillRoundedRect(layout.boardX + minX * layout.cell + 8, top, 3, Math.max(6, bottom - top), 2)
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 180,
      onComplete: () => trail.destroy(),
    })

    for (const cell of cells) {
      if (cell.y - hidden < 0) continue
      const point = this.center(layout, cell.x, cell.y, hidden)
      this.burst(point.px, point.py, color, 4)
    }
    const centerX = layout.boardX + ((minX + maxX + 1) / 2) * layout.cell
    this.burst(centerX, bottom - layout.cell / 2, 0xffffff, 6)
    this.shake(0.0035, 70)
  }

  spawn(cells: Cell[], piece: PieceId, layout: GameLayout, hidden: number): void {
    const color = this.theme.pieces[piece]
    for (const cell of cells) {
      if (cell.y - hidden < 0) continue
      const point = this.center(layout, cell.x, cell.y, hidden)
      this.burst(point.px, point.py, color, 2)
    }
  }

  clear(effect: ClearEffect, layout: GameLayout, hidden: number): void {
    const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
    const gold = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent2).color
    const white = 0xffffff

    for (const row of effect.rows) {
      const visibleRow = row - hidden
      if (visibleRow < 0) continue
      const y = layout.boardY + visibleRow * layout.cell
      const band = this.scene.add.graphics().setDepth(65)
      band.fillStyle(white, 0.9)
      band.fillRoundedRect(layout.boardX, y + 2, layout.boardW, layout.cell - 4, 4)
      band.fillStyle(effect.lines >= 4 ? gold : accent, 0.5)
      band.fillRoundedRect(layout.boardX, y + layout.cell * 0.24, layout.boardW, layout.cell * 0.5, 4)
      band.setAlpha(0)
      this.scene.tweens.add({
        targets: band,
        alpha: { from: 0.95, to: 0 },
        scaleY: { from: 1.6, to: 0.4 },
        duration: 260,
        ease: 'Cubic.Out',
        onComplete: () => band.destroy(),
      })
      for (let column = 0; column < 10; column += 2) {
        const point = this.center(layout, column, row, hidden)
        this.burst(point.px, point.py, column % 4 === 0 ? white : accent, 4)
      }
    }

    if (effect.lines >= 4) {
      this.stormBreak(layout)
    } else if (effect.lines >= 2) {
      this.banner(`${effect.lines} LINE${effect.lines > 1 ? 'S' : ''}`, this.theme.ui.accent, `+${effect.points.toLocaleString('en-US')}`, 0.85)
      this.shake(0.005, 110)
    }

    if (effect.tspin) this.floating(layout, 'T-SPIN', gold)
    if (effect.perfect) this.banner('PERFECT CLEAR', '#ffffff', `+${effect.points.toLocaleString('en-US')}`, 1)
    if (effect.combo >= 2) this.floating(layout, `COMBO ×${effect.combo}`, gold, 0.55)
  }

  private stormBreak(layout: GameLayout): void {
    const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
    const gold = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent2).color
    const bolts = this.scene.add.graphics().setDepth(75)
    const startX = layout.boardX + layout.boardW * (0.3 + Math.random() * 0.4)
    bolts.lineStyle(4, accent, 0.9)
    bolts.beginPath()
    bolts.moveTo(startX, layout.boardY)
    let y = layout.boardY
    while (y < layout.boardY + layout.boardH) {
      y += 18 + Math.random() * 28
      bolts.lineTo(startX + (Math.random() - 0.5) * 54, Math.min(layout.boardY + layout.boardH, y))
    }
    bolts.strokePath()
    bolts.lineStyle(1.5, 0xffffff, 0.9)
    bolts.strokePath()
    this.scene.tweens.add({ targets: bolts, alpha: 0, duration: 420, onComplete: () => bolts.destroy() })
    for (let index = 0; index < 7; index += 1) {
      this.burst(
        layout.boardX + Math.random() * layout.boardW,
        layout.boardY + Math.random() * layout.boardH,
        index % 2 === 0 ? accent : gold,
        10,
      )
    }
    const camera = this.scene.cameras.main
    if (!this.reducedMotion) camera.flash(120, 160, 220, 255, false)
    this.banner('STORM BREAK!', this.theme.ui.accent2, 'FOUR LINES', 1.1)
    this.shake(0.012, 280)
  }

  banner(text: string, color: string, sub = '', hold = 0.9): void {
    const camera = this.scene.cameras.main
    const x = camera.width / 2
    const y = camera.height / 2
    const container = this.scene.add.container(x, y).setDepth(90)
    const size = Math.max(26, Math.min(64, camera.width * 0.085))
    const main = this.scene.add
      .text(0, 0, text, {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: 'bold',
        stroke: '#06080f',
        strokeThickness: Math.max(4, size * 0.12),
        align: 'center',
      })
      .setOrigin(0.5)
    const glow = this.scene.add
      .text(0, 0, text, {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0.25)
      .setScale(1.08)
    container.add([glow, main])
    if (sub) {
      container.add(
        this.scene.add
          .text(0, size * 0.78, sub, {
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: `${Math.max(12, size * 0.24)}px`,
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setAlpha(0.9),
      )
    }
    container.setScale(0.6).setAlpha(0)
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: this.reducedMotion ? 120 : 220,
      ease: 'Back.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          y: y - 26,
          delay: hold * 1000,
          duration: 260,
          onComplete: () => container.destroy(),
        })
      },
    })
  }

  floating(layout: GameLayout, text: string, color: number, life = 0.8): void {
    const label = this.scene.add
      .text(layout.boardX + layout.boardW / 2, layout.boardY + layout.boardH * 0.38, text, {
        fontFamily: '"Arial Black", "Trebuchet MS", sans-serif',
        fontSize: `${Math.max(16, layout.cell * 0.7)}px`,
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        stroke: '#06080f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(88)
    this.scene.tweens.add({
      targets: label,
      y: label.y - 50,
      alpha: 0,
      duration: life * 1000,
      ease: 'Cubic.Out',
      onComplete: () => label.destroy(),
    })
  }

  surge(active: boolean): void {
    if (active) {
      this.banner('STORM SURGE', '#fbbf24', 'DOUBLE POINTS', 1.2)
      const camera = this.scene.cameras.main
      if (!this.reducedMotion) camera.flash(180, 251, 191, 36, false)
      this.shake(0.007, 200)
    } else {
      this.banner('SURGE OVER', '#93a0c6', '', 0.5)
    }
  }

  levelUp(level: number): void {
    this.banner(`LEVEL ${level}`, '#67f6ff', 'FASTER — STAY SHARP', 0.7)
  }

  private shake(intensity: number, duration: number): void {
    if (!this.shakeEnabled || this.reducedMotion) return
    this.scene.cameras.main.shake(duration, intensity)
  }

  destroy(): void {
    for (const emitter of this.emitters.values()) emitter.destroy()
    this.emitters.clear()
  }
}
