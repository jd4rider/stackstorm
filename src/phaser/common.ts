import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import { sound } from '../core/audio'
import { blockKey } from './textures'

export const DESIGN_W = 720
export const DESIGN_H = 1280
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, -apple-system, sans-serif'
export const DISPLAY = '"Arial Black", "Trebuchet MS", "Segoe UI", sans-serif'

export interface TextOptions {
  origin?: number | [number, number]
  align?: 'left' | 'center' | 'right'
  fontStyle?: string
  wrap?: number
  alpha?: number
  lineSpacing?: number
  fontFamily?: string
  letterSpacing?: number
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size = 20,
  color = '#ffffff',
  options: TextOptions = {},
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, content, {
    fontFamily: options.fontFamily ?? FONT,
    fontSize: `${size}px`,
    color,
    align: options.align ?? 'left',
    fontStyle: options.fontStyle,
    lineSpacing: options.lineSpacing,
    resolution: 2,
    wordWrap: options.wrap ? { width: options.wrap, useAdvancedWrap: true } : undefined,
  })
  if (options.origin !== undefined) {
    if (Array.isArray(options.origin)) text.setOrigin(options.origin[0], options.origin[1])
    else text.setOrigin(options.origin, options.origin)
  }
  if (options.alpha !== undefined) text.setAlpha(options.alpha)
  if (options.letterSpacing !== undefined) text.setLetterSpacing(options.letterSpacing)
  return text
}

export function display(scene: Phaser.Scene, x: number, y: number, content: string, size = 48, color = '#ffffff', origin = 0.5): Phaser.GameObjects.Text {
  return label(scene, x, y, content, size, color, {
    origin,
    fontFamily: DISPLAY,
    fontStyle: 'bold',
    letterSpacing: 1,
  })
}

export function stage(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0)
  const fit = (): void => {
    const width = scene.scale.width
    const height = scene.scale.height
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H)
    root.setScale(scale)
    root.setPosition((width - DESIGN_W * scale) / 2, (height - DESIGN_H * scale) / 2)
  }
  fit()
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, fit)
  })
  return root
}

/** Full-bleed themed gradient with a soft vignette and ambient shapes. */
export function backdrop(scene: Phaser.Scene, theme: Theme): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics().setDepth(-100)
  const draw = (): void => {
    const width = scene.scale.width
    const height = scene.scale.height
    graphics.clear()
    const top = Phaser.Display.Color.HexStringToColor(theme.ui.bgTop).color
    const bottom = Phaser.Display.Color.HexStringToColor(theme.ui.bgBottom).color
    graphics.fillStyle(bottom, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillGradientStyle(top, top, bottom, bottom, 1)
    graphics.fillRect(0, 0, width, height)

    const accent = Phaser.Display.Color.HexStringToColor(theme.ui.accent).color
    graphics.fillStyle(accent, 0.06)
    graphics.fillEllipse(width * 0.5, height * 0.1, width * 0.9, height * 0.3)

    if (theme.background === 'cosmic' || theme.background === 'neon') {
      for (let index = 0; index < 60; index += 1) {
        const x = ((Math.sin(index * 12.9898) * 43758.5453) % 1 + 1) % 1
        const y = ((Math.sin(index * 78.233) * 12345.6789) % 1 + 1) % 1
        graphics.fillStyle(index % 6 === 0 ? accent : 0xffffff, index % 3 === 0 ? 0.22 : 0.08)
        graphics.fillCircle(x * width, y * height, 0.8 + ((index * 7) % 5) * 0.35)
      }
    } else if (theme.background === 'candy' || theme.background === 'rainbow') {
      for (let index = 0; index < 9; index += 1) {
        graphics.fillStyle(index % 2 === 0 ? accent : 0xffffff, 0.035)
        graphics.fillCircle((index + 1) * (width / 10), height * 0.22 + (index % 3) * 70, 46 + (index % 4) * 26)
      }
    } else if (theme.background === 'crystal') {
      for (let index = 0; index < 8; index += 1) {
        const x = (index + 0.5) * (width / 8)
        graphics.fillStyle(accent, 0.045)
        graphics.fillTriangle(x, height * 0.55, x - 70, height, x + 70, height)
      }
    } else if (theme.background === 'pixel') {
      graphics.lineStyle(1, accent, 0.06)
      for (let x = 0; x < width; x += 32) graphics.lineBetween(x, 0, x, height)
      for (let y = 0; y < height; y += 32) graphics.lineBetween(0, y, width, y)
    } else if (theme.background === 'ocean') {
      graphics.lineStyle(2, accent, 0.08)
      for (let index = 0; index < 7; index += 1) {
        graphics.beginPath()
        for (let x = 0; x <= width; x += 18) {
          const y = height * 0.3 + index * 58 + Math.sin(x / 130 + index) * 18
          if (x === 0) graphics.moveTo(x, y)
          else graphics.lineTo(x, y)
        }
        graphics.strokePath()
      }
    } else if (theme.background === 'gold') {
      graphics.lineStyle(1, accent, 0.1)
      for (let index = 0; index < 12; index += 1) {
        const y = 80 + index * 74
        graphics.lineBetween(0, y, width * (0.2 + (index % 4) * 0.2), y)
        graphics.lineBetween(width * (0.2 + (index % 4) * 0.2), y, width * (0.2 + (index % 4) * 0.2), y + 36)
      }
    }

    // Vignette.
    graphics.fillStyle(0x000000, 0.22)
    graphics.fillRect(0, height * 0.86, width, height * 0.14)
  }
  draw()
  scene.scale.on(Phaser.Scale.Events.RESIZE, draw)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, draw)
    graphics.destroy()
  })
  return graphics
}

/** Slow drifting tetramino silhouettes behind a menu. */
export function ambientBlocks(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, theme: Theme, count = 12): void {
  const values = [1, 2, 3, 4, 5, 6, 7]
  for (let index = 0; index < count; index += 1) {
    const value = values[index % values.length]!
    const key = blockKey(theme.id, value)
    if (!scene.textures.exists(key)) continue
    const size = 28 + (index % 4) * 10
    const block = scene.add.image(
      (index * 137 + 60) % DESIGN_W,
      (index * 211 + 100) % DESIGN_H,
      key,
    )
    block.setDisplaySize(size, size).setAlpha(0.05 + (index % 3) * 0.03).setAngle(index * 11 % 25)
    parent.add(block)
    scene.tweens.add({
      targets: block,
      y: block.y + 160 + (index % 3) * 70,
      angle: block.angle + (index % 2 === 0 ? 18 : -18),
      duration: 9000 + (index % 5) * 2600,
      delay: index * 420,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.InOut',
    })
  }
}

export function logo(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, theme: Theme, size = 92): void {
  const glow = display(scene, x, y, 'STACKSTORM', size, theme.ui.accent, 0.5)
  glow.setAlpha(0.22).setScale(1.06)
  parent.add(glow)
  const shade = display(scene, x + 2, y + 5, 'STACKSTORM', size, '#000000', 0.5)
  shade.setAlpha(0.4)
  parent.add(shade)
  const main = display(scene, x, y, 'STACKSTORM', size, theme.ui.text, 0.5)
  parent.add(main)
  const accent = display(scene, x, y + 2, 'STACKSTORM', size, theme.ui.accent, 0.5)
  accent.setAlpha(0.18)
  parent.add(accent)
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.12, to: 0.3 },
    scale: { from: 1.02, to: 1.09 },
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  })
}

export interface PanelOptions {
  radius?: number
  fill?: number
  side?: number
  alpha?: number
  raised?: number
  stroke?: number
  strokeAlpha?: number
  shadow?: boolean
  highlight?: boolean
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {},
): Phaser.GameObjects.Container {
  const radius = options.radius ?? 22
  const raised = options.raised ?? 5
  const fill = options.fill ?? 0x111a38
  const side = options.side ?? 0x090d1c
  const container = scene.add.container(x, y)
  const graphics = scene.add.graphics()
  if (options.shadow !== false) {
    graphics.fillStyle(0x000000, 0.3)
    graphics.fillRoundedRect(3, raised + 5, width, height, radius)
  }
  graphics.fillStyle(side, 1)
  graphics.fillRoundedRect(0, raised, width, height, radius)
  graphics.fillStyle(fill, options.alpha ?? 1)
  graphics.fillRoundedRect(0, 0, width, height, radius)
  if (options.highlight !== false) {
    graphics.fillStyle(0xffffff, 0.07)
    graphics.fillRoundedRect(5, 4, width - 10, height * 0.3, radius * 0.8)
  }
  graphics.lineStyle(1.5, options.stroke ?? 0xffffff, options.strokeAlpha ?? 0.12)
  graphics.strokeRoundedRect(1, 1, width - 2, height - 2, radius)
  container.add(graphics)
  return container
}

export interface ButtonOptions {
  fill?: number
  textColor?: string
  size?: number
  radius?: number
  subtitle?: string
  disabled?: boolean
  icon?: string
  glow?: boolean
  silent?: boolean
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const radius = options.radius ?? Math.min(26, height / 2.3)
  const fill = options.fill ?? 0x2b3a66
  const container = scene.add.container(x, y)
  const graphics = scene.add.graphics()
  graphics.fillStyle(0x000000, 0.35)
  graphics.fillRoundedRect(3, 6, width, height, radius)
  graphics.fillStyle(darkHex(fill, 0.35), 1)
  graphics.fillRoundedRect(0, 4, width, height, radius)
  graphics.fillStyle(fill, options.disabled ? 0.55 : 1)
  graphics.fillRoundedRect(0, 0, width, height, radius)
  graphics.fillStyle(0xffffff, 0.14)
  graphics.fillRoundedRect(5, 4, width - 10, height * 0.38, radius * 0.7)
  if (options.glow) {
    graphics.lineStyle(2, 0xffffff, 0.28)
    graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius)
  }
  container.add(graphics)

  const content = label(scene, width / 2, height / 2 - 1, text, options.size ?? 20, options.textColor ?? '#ffffff', {
    origin: 0.5,
    fontStyle: 'bold',
  })
  container.add(content)
  if (options.icon) {
    container.add(label(scene, 22, height / 2 - 1, options.icon, options.size ?? 19, options.textColor ?? '#ffffff', { origin: 0.5 }))
  }
  if (options.subtitle) {
    container.add(label(scene, width / 2, height - 15, options.subtitle, 10, options.textColor ?? '#ffffff', { origin: 0.5, alpha: 0.7 }))
  }
  container.setSize(width, height + 6)

  if (!options.disabled) {
    const hit = scene.add.rectangle(width / 2, (height + 6) / 2, width, height + 6, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    container.add(hit)
    hit.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.02, duration: 90 }))
    hit.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: 90 }))
    hit.on('pointerdown', () => scene.tweens.add({ targets: container, scale: 0.96, duration: 60 }))
    hit.on('pointerup', () => {
      scene.tweens.add({ targets: container, scale: 1, duration: 120, ease: 'Back.Out' })
      if (!options.silent) sound.click()
      onClick()
    })
  } else {
    container.setAlpha(0.5)
  }
  return container
}

export function iconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  glyph: string,
  onClick: () => void,
  options: { size?: number; fill?: number; color?: string; label?: string; disabled?: boolean } = {},
): Phaser.GameObjects.Container {
  const size = options.size ?? 54
  const fill = options.fill ?? 0x1b2850
  const container = scene.add.container(x, y)
  const graphics = scene.add.graphics()
  graphics.fillStyle(0x000000, 0.3)
  graphics.fillRoundedRect(-size / 2 + 2, -size / 2 + 5, size, size, size / 3)
  graphics.fillStyle(darkHex(fill, 0.2), 1)
  graphics.fillRoundedRect(-size / 2, -size / 2 + 3, size, size, size / 3)
  graphics.fillStyle(fill, 1)
  graphics.fillRoundedRect(-size / 2, -size / 2, size, size, size / 3)
  graphics.fillStyle(0xffffff, 0.1)
  graphics.fillRoundedRect(-size / 2 + 4, -size / 2 + 3, size - 8, size * 0.36, size / 4)
  container.add(graphics)
  container.add(label(scene, 0, options.label ? -5 : 0, glyph, size * 0.4, options.color ?? '#ffffff', { origin: 0.5, fontStyle: 'bold' }))
  if (options.label) container.add(label(scene, 0, size * 0.28, options.label, 9, options.color ?? '#ffffff', { origin: 0.5, alpha: 0.75 }))
  container.setSize(size, size)
  if (!options.disabled) {
    const hit = scene.add.rectangle(0, 0, size, size, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    container.add(hit)
    hit.on('pointerdown', () => scene.tweens.add({ targets: container, scale: 0.92, duration: 55 }))
    hit.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: 80 }))
    hit.on('pointerup', () => {
      scene.tweens.add({ targets: container, scale: 1, duration: 110, ease: 'Back.Out' })
      sound.click()
      onClick()
    })
  } else {
    container.setAlpha(0.4)
  }
  return container
}

export function starRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  stars: number,
  size = 22,
  total = 3,
  animate = false,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y)
  const gap = size * 1.2
  for (let index = 0; index < total; index += 1) {
    const earned = index < stars
    const glyph = label(scene, (index - (total - 1) / 2) * gap, 0, earned ? '\u2605' : '\u2606', size, earned ? '#ffce55' : '#ffffff', {
      origin: 0.5,
      alpha: earned ? 1 : 0.26,
    })
    container.add(glyph)
    if (earned && animate) {
      glyph.setScale(0.4)
      scene.tweens.add({ targets: glyph, scale: 1, duration: 280, delay: 140 + index * 120, ease: 'Back.Out' })
    }
  }
  return container
}

export function toast(scene: Phaser.Scene, message: string, theme: Theme, options: { y?: number; duration?: number } = {}): void {
  const width = Math.min(600, scene.scale.width - 40)
  const y = options.y ?? 120
  const height = 54
  const container = scene.add.container(scene.scale.width / 2, y).setDepth(5000)
  const card = panel(scene, -width / 2, 0, width, height, {
    fill: 0x101a32,
    side: 0x070b16,
    radius: 16,
    raised: 3,
    stroke: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
    strokeAlpha: 0.3,
  })
  container.add(card)
  container.add(
    label(scene, 0, height / 2 - 1, message, 14, theme.ui.text, {
      origin: 0.5,
      align: 'center',
      wrap: width - 32,
    }),
  )
  container.setAlpha(0)
  scene.tweens.add({
    targets: container,
    alpha: 1,
    y: y + 8,
    duration: 150,
    hold: options.duration ?? 1400,
    yoyo: true,
    onComplete: () => container.destroy(),
  })
}

export function fadeTo(scene: Phaser.Scene, key: string, data?: object): void {
  const camera = scene.cameras.main
  if (camera.fadeEffect?.isRunning) return
  camera.fadeOut(170, 8, 11, 26)
  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data))
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(220, 8, 11, 26)
}

export function header(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  titleText: string,
  onBack: (() => void) | null,
  theme: Theme,
  right = '',
): void {
  if (onBack) {
    const back = iconButton(scene, 44, 48, '\u2190', onBack, { size: 46 })
    parent.add(back)
  }
  const titleLabel = label(scene, DESIGN_W / 2, 46, titleText, 28, theme.ui.text, {
    origin: 0.5,
    fontFamily: DISPLAY,
    fontStyle: 'bold',
  })
  parent.add(titleLabel)
  if (right) {
    parent.add(label(scene, DESIGN_W - 26, 48, right, 14, theme.ui.accent, { origin: [1, 0.5], fontStyle: 'bold' }))
  }
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms))
  const minutes = Math.floor(total / 60_000)
  const seconds = Math.floor((total % 60_000) / 1000)
  const tenths = Math.floor((total % 1000) / 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${total % 60}s`
}

export function darkHex(hex: number, amount = 0.3): number {
  const r = Math.max(0, Math.round(((hex >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((hex >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((hex & 0xff) * (1 - amount)))
  return (r << 16) | (g << 8) | b
}

export function announce(message: string): void {
  if (typeof document === 'undefined') return
  const node = document.getElementById('game-status')
  if (node) node.textContent = message
}
