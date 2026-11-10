import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import { dropDistance } from '../engine/board'
import type { StackstormEngine } from '../engine/engine'
import { SHAPES } from '../engine/pieces'
import { PIECE_INDEX, type PieceId } from '../engine/types'
import type { GameLayout } from './layout'
import { SPARK_KEY, blockKey, ghostKey, mixHex } from './textures'

export class PiecePreview {
  private readonly container: Phaser.GameObjects.Container
  private readonly images: Phaser.GameObjects.Image[] = []
  private cell = 12

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, cell = 12) {
    this.container = scene.add.container(0, 0)
    parent.add(this.container)
    for (let index = 0; index < 4; index += 1) {
      const image = scene.add.image(0, 0, SPARK_KEY).setVisible(false)
      this.container.add(image)
      this.images.push(image)
    }
    this.setCell(cell)
  }

  setCell(cell: number): void {
    this.cell = Math.max(5, cell)
    for (const image of this.images) image.setDisplaySize(this.cell - 1, this.cell - 1)
    if (this.images[0]?.visible) this.redraw()
  }

  show(piece: PieceId | null, theme: Theme, alpha = 1): void {
    this.container.setAlpha(alpha)
    if (!piece) {
      for (const image of this.images) image.setVisible(false)
      return
    }
    this.piece = piece
    this.theme = theme
    this.redraw()
  }

  private piece: PieceId | null = null
  private theme: Theme | null = null

  private redraw(): void {
    if (!this.piece || !this.theme) return
    const cells = SHAPES[this.piece][0]!
    const xs = cells.map((cell) => cell.x)
    const ys = cells.map((cell) => cell.y)
    const width = Math.max(...xs) - Math.min(...xs) + 1
    const height = Math.max(...ys) - Math.min(...ys) + 1
    const key = blockKey(this.theme.id, PIECE_INDEX[this.piece])
    for (let index = 0; index < 4; index += 1) {
      const cell = cells[index]!
      const image = this.images[index]!
      image.setTexture(key)
      image.setVisible(true)
      image.setDisplaySize(this.cell - 1, this.cell - 1)
      image.setPosition(
        (cell.x - Math.min(...xs) - (width - 1) / 2) * this.cell,
        (cell.y - Math.min(...ys) - (height - 1) / 2) * this.cell,
      )
    }
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y)
  }

  destroy(): void {
    this.container.destroy(true)
  }
}

export class BoardRenderer {
  private readonly scene: Phaser.Scene
  private theme: Theme
  private layout: GameLayout
  private readonly container: Phaser.GameObjects.Container
  private readonly background: Phaser.GameObjects.Graphics
  private readonly guides: Phaser.GameObjects.Graphics
  private readonly wellGlow: Phaser.GameObjects.Graphics
  private readonly activeGlow: Phaser.GameObjects.Graphics
  private readonly cells: Phaser.GameObjects.Image[] = []
  private readonly activeCells: Phaser.GameObjects.Image[] = []
  private readonly ghostCells: Phaser.GameObjects.Image[] = []
  private readonly lockOverlay: Phaser.GameObjects.Graphics
  private readonly lastValues: number[] = []
  private highContrast = false
  private cellSize = 0
  private wells: number[] = []

  constructor(scene: Phaser.Scene, theme: Theme, layout: GameLayout) {
    this.scene = scene
    this.theme = theme
    this.layout = layout
    this.container = scene.add.container(layout.boardX, layout.boardY)
    this.background = scene.add.graphics()
    this.container.add(this.background)
    this.guides = scene.add.graphics()
    this.container.add(this.guides)
    this.wellGlow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD)
    this.container.add(this.wellGlow)
    for (let index = 0; index < 10 * 20; index += 1) {
      const image = scene.add.image(0, 0, blockKey(theme.id, 1)).setOrigin(0, 0).setVisible(false)
      this.container.add(image)
      this.cells.push(image)
      this.lastValues.push(-1)
    }
    this.activeGlow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD)
    this.container.add(this.activeGlow)
    for (let index = 0; index < 8; index += 1) {
      const ghost = scene.add.image(0, 0, ghostKey(theme.id)).setOrigin(0, 0).setVisible(false)
      this.container.add(ghost)
      this.ghostCells.push(ghost)
      if (index < 4) {
        const active = scene.add.image(0, 0, blockKey(theme.id, 1)).setOrigin(0, 0).setVisible(false)
        this.container.add(active)
        this.activeCells.push(active)
      }
    }
    this.lockOverlay = scene.add.graphics()
    this.container.add(this.lockOverlay)
    this.drawBackground()
  }

  setHighContrast(enabled: boolean): void {
    this.highContrast = enabled
    this.drawBackground()
  }

  /**
   * Puzzle levels mark the empty lanes the player has to fill. Without this a
   * wall of stone with one narrow slot reads as a dead board.
   */
  setWells(columns: number[]): void {
    this.wells = columns
  }

  setTheme(theme: Theme): void {
    this.theme = theme
    for (let index = 0; index < this.lastValues.length; index += 1) this.lastValues[index] = -1
    for (const image of this.activeCells) image.setTexture(blockKey(theme.id, 1))
    for (const image of this.ghostCells) image.setTexture(ghostKey(theme.id))
    this.drawBackground()
  }

  setLayout(layout: GameLayout): void {
    this.layout = layout
    this.container.setPosition(layout.boardX, layout.boardY)
    this.drawBackground()
  }

  private drawBackground(): void {
    const { boardW, boardH, cell } = this.layout
    const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
    const accent2 = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent2).color
    const danger = Phaser.Display.Color.HexStringToColor(this.theme.ui.danger).color
    const gridColor = Phaser.Display.Color.HexStringToColor(this.theme.ui.grid).color
    // Keep the well itself a deep neutral navy: tinting it with the theme accent
    // turned the whole screen one green-teal shade and swallowed the seven
    // piece colours. The accent now lives in the frame, rails and glow only.
    const top = mixHex(0x18213c, 0x0a0f1e, 0.35)
    const bottom = 0x050810
    this.background.clear()

    // Soft neon bloom around the well.
    for (let ring = 5; ring >= 1; ring -= 1) {
      this.background.lineStyle(3, accent, 0.035)
      this.background.strokeRoundedRect(-ring * 3, -ring * 3, boardW + ring * 6, boardH + ring * 6, 12 + ring * 3)
    }
    this.background.fillStyle(0x05070f, 0.9)
    this.background.fillRoundedRect(-5, -2, boardW + 10, boardH + 10, 14)

    // Vertical gradient drawn as bands so it also renders on Canvas.
    const bands = 26
    const bandHeight = boardH / bands
    for (let index = 0; index < bands; index += 1) {
      this.background.fillStyle(mixHex(top, bottom, index / (bands - 1)), 1)
      this.background.fillRect(2, Math.floor(index * bandHeight), boardW - 4, Math.ceil(bandHeight) + 1)
    }

    // Faint checkerboard keeps empty cells readable without looking grey.
    for (let row = 0; row < 20; row += 1) {
      for (let column = 0; column < 10; column += 1) {
        if ((row + column) % 2 !== 0) continue
        this.background.fillStyle(0xffffff, this.highContrast ? 0.06 : 0.022)
        this.background.fillRect(column * cell + 1, row * cell + 1, cell - 2, cell - 2)
      }
    }

    this.background.lineStyle(1, gridColor, this.highContrast ? 0.95 : 0.8)
    for (let column = 1; column < 10; column += 1) {
      this.background.lineBetween(column * cell, 0, column * cell, boardH)
    }
    for (let row = 1; row < 20; row += 1) {
      this.background.lineBetween(0, row * cell, boardW, row * cell)
    }

    // Spawn glow at the top, warning light at the floor.
    this.background.fillStyle(accent, 0.1)
    this.background.fillRect(2, 2, boardW - 4, cell * 0.8)
    this.background.fillStyle(accent, 0.05)
    this.background.fillRect(2, cell * 0.8, boardW - 4, cell * 0.7)
    this.background.fillStyle(danger, 0.07)
    this.background.fillRect(2, boardH - cell * 2, boardW - 4, cell * 2 - 2)

    // Side rails.
    this.background.fillStyle(accent, 0.3)
    this.background.fillRect(2, 10, 2, boardH - 20)
    this.background.fillRect(boardW - 4, 10, 2, boardH - 20)

    // Frame, inner glow and bold corner brackets.
    this.background.lineStyle(2.5, accent, 0.9)
    this.background.strokeRoundedRect(0.5, 0.5, boardW - 1, boardH - 1, 10)
    this.background.lineStyle(1, accent2, 0.55)
    this.background.strokeRoundedRect(4.5, 4.5, boardW - 9, boardH - 9, 8)
    const bracket = Math.max(16, cell * 0.7)
    this.background.lineStyle(4, accent2, 1)
    const corners = [
      [3, 3, 1, 1],
      [boardW - 3, 3, -1, 1],
      [3, boardH - 3, 1, -1],
      [boardW - 3, boardH - 3, -1, -1],
    ] as const
    for (const [x, y, dx, dy] of corners) {
      this.background.lineBetween(x, y, x + bracket * dx, y)
      this.background.lineBetween(x, y, x, y + bracket * dy)
    }
  }

  sync(engine: StackstormEngine): void {
    const { cell } = this.layout
    const hidden = engine.hiddenRows
    const layoutChanged = this.cellSize !== cell
    if (layoutChanged) {
      this.cellSize = cell
      this.lastValues.fill(-1)
    }
    this.guides.clear()
    this.activeGlow.clear()
    this.wellGlow.clear()
    if (this.wells.length > 0) {
      const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
      const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 320)
      const bands = 12
      for (const column of this.wells) {
        const x = column * cell
        for (let index = 0; index < bands; index += 1) {
          const alpha = (0.02 + 0.11 * (index / (bands - 1))) * (0.6 + 0.4 * pulse)
          this.wellGlow.fillStyle(accent, alpha)
          this.wellGlow.fillRect(x + 2, (index * this.layout.boardH) / bands, cell - 4, this.layout.boardH / bands + 1)
        }
        this.wellGlow.lineStyle(2, accent, 0.16 + 0.24 * pulse)
        this.wellGlow.lineBetween(x + 1, 2, x + 1, this.layout.boardH - 2)
        this.wellGlow.lineBetween(x + cell - 1, 2, x + cell - 1, this.layout.boardH - 2)
        // Chevrons slide down the lane so the drop target is unmistakable.
        const offset = (this.scene.time.now / 11) % (cell * 0.9)
        this.wellGlow.lineStyle(2.5, accent, 0.4 + 0.4 * pulse)
        for (let index = 0; index < 3; index += 1) {
          const y = 10 + offset + index * cell * 0.9
          if (y > this.layout.boardH - cell * 0.4) continue
          this.wellGlow.beginPath()
          this.wellGlow.moveTo(x + cell * 0.28, y)
          this.wellGlow.lineTo(x + cell * 0.5, y + cell * 0.22)
          this.wellGlow.lineTo(x + cell * 0.72, y)
          this.wellGlow.strokePath()
        }
      }
    }
    this.activeGlow.setAlpha(0.82 + 0.18 * Math.sin(this.scene.time.now / 240))
    for (let row = 0; row < 20; row += 1) {
      for (let column = 0; column < 10; column += 1) {
        const index = row * 10 + column
        const value = engine.board[row + hidden]?.[column] ?? 0
        const image = this.cells[index]!
        const changed = value !== this.lastValues[index]
        if (changed) {
          this.lastValues[index] = value
          if (value === 0) {
            image.setVisible(false)
          } else {
            image.setTexture(blockKey(this.theme.id, value))
            image.setVisible(true)
          }
        }
        if (value !== 0 && (changed || layoutChanged)) {
          image.setPosition(column * cell + 1, row * cell + 1)
          image.setDisplaySize(cell - 2, cell - 2)
        }
      }
    }

    const active = engine.active
    const distance = active
      ? dropDistance(engine.board, active.id, active.rotation, active.x, active.y, engine.cols)
      : 0
    for (let index = 0; index < 4; index += 1) {
      const image = this.activeCells[index]!
      const ghost = this.ghostCells[index]!
      if (!active) {
        image.setVisible(false)
        ghost.setVisible(false)
        continue
      }
      const cells = SHAPES[active.id][active.rotation]!
      const cellOffset = cells[index]!
      const x = active.x + cellOffset.x
      const y = active.y + cellOffset.y - hidden
      const visible = y >= 0 && y < 20 && x >= 0 && x < 10
      image.setVisible(visible)
      if (visible) {
        image.setTexture(blockKey(this.theme.id, PIECE_INDEX[active.id]))
        image.setPosition(x * cell + 1, y * cell + 1)
        image.setDisplaySize(cell - 2, cell - 2)
      }

      const ghostY = active.y + distance + cellOffset.y - hidden
      const ghostVisible = engine.grounded ? false : ghostY >= 0 && ghostY < 20 && x >= 0 && x < 10
      ghost.setVisible(ghostVisible)
      if (ghostVisible) {
        ghost.setPosition(x * cell + 1, ghostY * cell + 1)
        ghost.setDisplaySize(cell - 2, cell - 2)
        ghost.setAlpha(0.55)
      }
    }

    if (active) {
      const cells = SHAPES[active.id][active.rotation]!
      const xs = cells.map((offset) => active.x + offset.x)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
      this.guides.fillStyle(accent, 0.045)
      this.guides.fillRect(minX * cell, 0, (maxX - minX + 1) * cell, this.layout.boardH)
      this.guides.fillStyle(accent, 0.11)
      this.guides.fillRect(minX * cell, 0, (maxX - minX + 1) * cell, 2)
      const color = this.theme.pieces[active.id]
      for (const offset of cells) {
        const x = active.x + offset.x
        const y = active.y + offset.y - hidden
        if (y < 0 || y >= 20 || x < 0 || x >= 10) continue
        this.activeGlow.fillStyle(color, 0.16)
        this.activeGlow.fillRoundedRect(x * cell - 2, y * cell - 2, cell + 4, cell + 4, Math.max(4, cell * 0.2))
      }
    }

    this.lockOverlay.clear()
    if (active && engine.grounded && engine.status === 'playing') {
      const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
      const pulse = 0.55 + 0.45 * Math.sin(this.scene.time.now / 85)
      const cells = SHAPES[active.id][active.rotation]!
      for (const offset of cells) {
        const x = active.x + offset.x
        const y = active.y + offset.y - hidden
        if (y < 0 || y >= 20 || x < 0 || x >= 10) continue
        this.lockOverlay.fillStyle(0xffffff, 0.08 + 0.12 * pulse)
        this.lockOverlay.fillRoundedRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4, Math.max(2, cell * 0.12))
        this.lockOverlay.lineStyle(2, accent, 0.35 + 0.4 * pulse)
        this.lockOverlay.strokeRoundedRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4, Math.max(2, cell * 0.12))
      }
      // A slim bar across the top of the board shows the remaining slide time.
      const remaining = 1 - engine.snapshot().lockProgress
      this.lockOverlay.fillStyle(accent, 0.85)
      this.lockOverlay.fillRect(3, 3, (this.layout.boardW - 6) * Math.max(0, remaining), 3)
    }
  }

  destroy(): void {
    this.container.destroy(true)
  }
}
