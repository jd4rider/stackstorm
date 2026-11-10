import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import { PIECE_IDS, PIECE_INDEX, type PieceId } from '../engine/types'

export const SIZE = 64

export function mixHex(from: number, to: number, amount: number): number {
  const ratio = Math.max(0, Math.min(1, amount))
  const r = ((from >> 16) & 0xff) * (1 - ratio) + ((to >> 16) & 0xff) * ratio
  const g = ((from >> 8) & 0xff) * (1 - ratio) + ((to >> 8) & 0xff) * ratio
  const b = (from & 0xff) * (1 - ratio) + (to & 0xff) * ratio
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}

export function lighten(color: number, amount = 0.35): number {
  return mixHex(color, 0xffffff, amount)
}

export function darken(color: number, amount = 0.35): number {
  return mixHex(color, 0x000000, amount)
}

export function blockKey(themeId: string, value: number): string {
  return `ss-block-${themeId}-${value}`
}

export function ghostKey(themeId: string): string {
  return `ss-ghost-${themeId}`
}

export const SPARK_KEY = 'ss-spark'
export const GLOW_KEY = 'ss-glow'

function drawMark(graphics: Phaser.GameObjects.Graphics, id: PieceId, color: number, style: Theme['style']): void {
  graphics.fillStyle(0xffffff, style === 'pixel' ? 0.5 : 0.34)
  const mark = (x: number, y: number, width: number, height: number, radius = 1): void => {
    if (style === 'pixel') graphics.fillRect(x, y, width, height)
    else graphics.fillRoundedRect(x, y, width, height, radius)
  }
  switch (id) {
    case 'I':
      mark(22, 12, 20, 4)
      mark(22, 48, 20, 4)
      break
    case 'O':
      mark(24, 24, 16, 4)
      mark(24, 36, 16, 4)
      mark(24, 24, 4, 16)
      mark(36, 24, 4, 16)
      break
    case 'T':
      mark(20, 24, 24, 4)
      mark(30, 24, 4, 18)
      break
    case 'S':
      mark(20, 36, 14, 4)
      mark(30, 24, 14, 4)
      break
    case 'Z':
      mark(20, 24, 14, 4)
      mark(30, 36, 14, 4)
      break
    case 'J':
      mark(22, 24, 4, 18)
      mark(22, 38, 18, 4)
      break
    case 'L':
      mark(38, 24, 4, 18)
      mark(24, 38, 18, 4)
      break
  }
  // A soft inner rim keeps the block readable against every theme.
  graphics.lineStyle(1.5, lighten(color, 0.3), 0.35)
}

function drawBlock(
  scene: Phaser.Scene,
  theme: Theme,
  value: number,
  key: string,
  style: Theme['style'],
  colorOverride?: number,
): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false)
  const id = PIECE_IDS[value - 1] as PieceId | undefined
  const color = colorOverride ?? (id ? theme.pieces[id] : theme.stone)
  const radius = style === 'pixel' ? 0 : 12
  const inset = 3

  graphics.fillStyle(0x000000, 0.28)
  if (style === 'pixel') graphics.fillRect(inset + 2, inset + 5, SIZE - inset * 2, SIZE - inset * 2)
  else graphics.fillRoundedRect(inset + 2, inset + 5, SIZE - inset * 2, SIZE - inset * 2, radius)

  graphics.fillStyle(darken(color, 0.32), 1)
  if (style === 'pixel') graphics.fillRect(inset, inset + 3, SIZE - inset * 2, SIZE - inset * 2)
  else graphics.fillRoundedRect(inset, inset + 3, SIZE - inset * 2, SIZE - inset * 2, radius)

  graphics.fillStyle(color, 1)
  if (style === 'pixel') graphics.fillRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2)
  else graphics.fillRoundedRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2, radius)

  // Lower face shading.
  graphics.fillStyle(darken(color, 0.2), 0.55)
  if (style === 'pixel') graphics.fillRect(inset + 3, SIZE - 22, SIZE - inset * 2 - 6, 17)
  else graphics.fillRoundedRect(inset + 3, SIZE - 24, SIZE - inset * 2 - 6, 18, radius * 0.7)

  // Upper gloss.
  graphics.fillStyle(0xffffff, style === 'pixel' ? 0.16 : 0.2)
  if (style === 'pixel') graphics.fillRect(inset + 4, inset + 4, SIZE - inset * 2 - 8, 15)
  else graphics.fillRoundedRect(inset + 4, inset + 4, SIZE - inset * 2 - 8, 21, radius * 0.8)

  // A crisp bevel on the top and left edges.
  graphics.lineStyle(2, lighten(color, 0.5), 0.72)
  graphics.beginPath()
  graphics.moveTo(inset + 4, SIZE - inset - 4)
  graphics.lineTo(inset + 4, inset + 4)
  graphics.lineTo(SIZE - inset - 4, inset + 4)
  graphics.strokePath()

  // Glossy highlight.
  if (style !== 'pixel') {
    graphics.fillStyle(0xffffff, style === 'glass' ? 0.28 : 0.18)
    graphics.fillEllipse(SIZE * 0.36, SIZE * 0.26, SIZE * 0.34, SIZE * 0.17)
  } else {
    graphics.fillStyle(0xffffff, 0.28)
    graphics.fillRect(inset + 6, inset + 6, 8, 4)
  }

  // Border and inner hairline.
  graphics.lineStyle(2, darken(color, 0.45), 0.9)
  if (style === 'pixel') graphics.strokeRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2)
  else graphics.strokeRoundedRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2, radius)

  if (value === 8) {
    // Stone: a couple of quiet cracks instead of a piece symbol.
    graphics.lineStyle(1.5, darken(color, 0.5), 0.7)
    graphics.beginPath()
    graphics.moveTo(20, 18)
    graphics.lineTo(28, 30)
    graphics.lineTo(24, 40)
    graphics.lineTo(35, 48)
    graphics.strokePath()
    graphics.beginPath()
    graphics.moveTo(44, 16)
    graphics.lineTo(38, 28)
    graphics.strokePath()
  } else if (id) {
    drawMark(graphics, id, color, style)
  }

  graphics.generateTexture(key, SIZE, SIZE)
  graphics.destroy()
}

function drawGhost(scene: Phaser.Scene, theme: Theme, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false)
  const accent = Phaser.Display.Color.HexStringToColor(theme.ui.accent).color
  graphics.fillStyle(accent, 0.06)
  graphics.fillRoundedRect(5, 5, SIZE - 10, SIZE - 10, 11)
  graphics.lineStyle(2.5, accent, 0.85)
  graphics.strokeRoundedRect(5, 5, SIZE - 10, SIZE - 10, 11)
  graphics.generateTexture(key, SIZE, SIZE)
  graphics.destroy()
}

function drawSpark(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false)
  graphics.fillStyle(0xffffff, 1)
  graphics.fillCircle(8, 8, 7)
  graphics.fillStyle(0xffffff, 0.4)
  graphics.fillCircle(8, 8, 9)
  graphics.generateTexture(SPARK_KEY, 18, 18)
  graphics.destroy()
}

function drawGlow(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false)
  for (let ring = 8; ring >= 1; ring -= 1) {
    graphics.fillStyle(0xffffff, 0.045)
    graphics.fillCircle(64, 64, ring * 8)
  }
  graphics.generateTexture(GLOW_KEY, 128, 128)
  graphics.destroy()
}

export function buildTextures(scene: Phaser.Scene, themes: Theme[], onProgress?: (done: number, total: number) => void): void {
  const total = themes.length * 9 + 2
  let done = 0
  if (!scene.textures.exists(SPARK_KEY)) drawSpark(scene)
  done += 1
  if (!scene.textures.exists(GLOW_KEY)) drawGlow(scene)
  done += 1
  for (const theme of themes) {
    for (let value = 1; value <= 8; value += 1) {
      const key = blockKey(theme.id, value)
      if (!scene.textures.exists(key)) drawBlock(scene, theme, value, key, theme.style)
      done += 1
      if (onProgress) onProgress(done, total)
    }
    const ghost = ghostKey(theme.id)
    if (!scene.textures.exists(ghost)) drawGhost(scene, theme, ghost)
    done += 1
    if (onProgress) onProgress(done, total)
  }
}

export function stoneKey(worldId: number): string {
  return `ss-stone-world-${worldId}`
}

/** Bake one stone wall texture per world so each world reads as its own rock. */
export function ensureStoneTexture(
  scene: Phaser.Scene,
  theme: Theme,
  worldId: number,
  color: number,
): string {
  const key = stoneKey(worldId)
  if (!scene.textures.exists(key)) drawBlock(scene, theme, 8, key, theme.style, color)
  return key
}

export function pieceColor(theme: Theme, id: PieceId): number {
  return theme.pieces[id]
}

export function pieceValue(id: PieceId): number {
  return PIECE_INDEX[id]
}
