import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import type { GameLayout, Rect } from './layout'
import { darkHex } from './common'

export type ControlAction = 'left' | 'right' | 'soft' | 'ccw' | 'cw' | 'drop' | 'hold'

interface ControlSpec {
  action: ControlAction
  glyph: string
  label: string
}

// One six-button strip for every screen shape. The two move arrows sit at the
// far ends so a thumb on either side always finds them, and there is a single
// spin button: counter-clockwise rotation stays on the Z key for players who
// want it, but the touch pad keeps only the action most people reach for.
const SPECS: ControlSpec[] = [
  { action: 'left', glyph: '\u2190', label: 'MOVE' },
  { action: 'soft', glyph: '\u25BC', label: 'SOFT' },
  { action: 'cw', glyph: '\u21BB', label: 'SPIN' },
  { action: 'drop', glyph: '\u21E9', label: 'DROP' },
  { action: 'hold', glyph: '\u21C4', label: 'HOLD' },
  { action: 'right', glyph: '\u2192', label: 'MOVE' },
]

export class TouchControls {
  private readonly scene: Phaser.Scene
  private theme: Theme
  private readonly onPress: (action: ControlAction) => void
  private readonly onRelease: (action: ControlAction) => void
  private readonly root: Phaser.GameObjects.Container
  private visible = true

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    onPress: (action: ControlAction) => void,
    onRelease: (action: ControlAction) => void,
  ) {
    this.scene = scene
    this.theme = theme
    this.onPress = onPress
    this.onRelease = onRelease
    this.root = scene.add.container(0, 0).setDepth(45)
  }

  setTheme(theme: Theme): void {
    this.theme = theme
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.root.setVisible(visible)
  }

  setLayout(layout: GameLayout): void {
    this.root.removeAll(true)
    if (!layout.touch) return
    this.root.setVisible(this.visible)
    layout.touch.row1.forEach((rect, index) => {
      const spec = SPECS[index]
      if (spec) this.create(rect, spec)
    })
  }

  private create(rect: Rect, spec: ControlSpec): void {
    const container = this.scene.add.container(rect.x + rect.w / 2, rect.y + rect.h / 2)
    const graphics = this.scene.add.graphics()
    const fill = 0x111a33
    const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
    const radius = Math.min(16, rect.w * 0.26)
    graphics.fillStyle(0x000000, 0.35)
    graphics.fillRoundedRect(-rect.w / 2 + 2, -rect.h / 2 + 4, rect.w, rect.h, radius)
    graphics.fillStyle(darkHex(fill, 0.25), 1)
    graphics.fillRoundedRect(-rect.w / 2, -rect.h / 2 + 2, rect.w, rect.h, radius)
    graphics.fillStyle(fill, 0.95)
    graphics.fillRoundedRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, radius)
    graphics.fillStyle(0xffffff, 0.09)
    graphics.fillRoundedRect(-rect.w / 2 + 4, -rect.h / 2 + 3, rect.w - 8, rect.h * 0.35, Math.min(11, radius))
    graphics.lineStyle(1.2, spec.action === 'drop' ? accent : 0xffffff, spec.action === 'drop' ? 0.55 : 0.14)
    graphics.strokeRoundedRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, radius)
    container.add(graphics)

    const glyphSize = Math.min(rect.h * 0.44, 26)
    const glyph = this.scene.add
      .text(0, -rect.h * 0.08, spec.glyph, {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: `${glyphSize}px`,
        color: spec.action === 'drop' ? this.theme.ui.accent : this.theme.ui.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const text = this.scene.add
      .text(0, rect.h * 0.27, spec.label, {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: `${Math.max(7, Math.min(10, rect.h * 0.17))}px`,
        color: this.theme.ui.muted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    container.add([glyph, text])

    const hit = this.scene.add.rectangle(0, 0, rect.w, rect.h, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    const isHoldable = spec.action === 'left' || spec.action === 'right' || spec.action === 'soft'
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault?.()
      container.setScale(0.94)
      if (navigator.vibrate) navigator.vibrate(6)
      this.onPress(spec.action)
    })
    const release = (): void => {
      container.setScale(1)
      if (isHoldable) this.onRelease(spec.action)
    }
    hit.on('pointerup', release)
    hit.on('pointerout', release)
    hit.on('pointerupoutside', release)
    container.add(hit)
    this.root.add(container)
  }

  destroy(): void {
    this.root.destroy(true)
  }
}
