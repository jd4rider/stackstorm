import Phaser from 'phaser'
import type { World } from '../data/worlds'
import { WORLDS, worldById } from '../data/worlds'
import { themeById } from '../config/themes'
import { sound } from '../core/audio'
import { loadProgress, type Progress } from '../core/saves'
import { LEVELS_PER_WORLD, levelAt, levelsForWorld } from '../puzzles/levels'
import type { PuzzleLevel } from '../puzzles/types'
import {
  backdrop,
  button,
  fadeIn,
  fadeTo,
  formatNumber,
  header,
  label,
  panel,
  starRow,
  stage,
  toast,
  DESIGN_W,
} from './common'
import { buildTextures, blockKey } from './textures'

export class JourneyScene extends Phaser.Scene {
  private progress!: Progress
  private world!: World
  private mapRoot!: Phaser.GameObjects.Container
  private chipRoot!: Phaser.GameObjects.Container
  private footerRoot!: Phaser.GameObjects.Container

  constructor() {
    super('Journey')
  }

  create(data: { world?: number }): void {
    this.progress = loadProgress()
    const theme = themeById(this.progress.settings.themeId)
    sound.setMusicMode('puzzle')
    sound.setMusicWanted(this.progress.settings.musicVolume > 0 && !this.progress.settings.muted)
    backdrop(this, theme)
    const root = stage(this)

    const currentWorld = worldById(
      Math.max(1, Math.min(10, data.world ?? levelAt(this.progress.journey.unlocked)?.world ?? 1)),
    )
    this.world = currentWorld
    header(this, root, 'PUZZLE JOURNEY', () => fadeTo(this, 'Menu'), theme, `\u2605 ${Object.values(this.progress.journey.stars).reduce((a, b) => a + b, 0)}`)

    this.chipRoot = this.add.container(0, 0)
    root.add(this.chipRoot)
    this.mapRoot = this.add.container(0, 0)
    root.add(this.mapRoot)
    this.footerRoot = this.add.container(0, 0)
    root.add(this.footerRoot)

    this.buildWorld(this.world.id)
    fadeIn(this)
  }

  private buildWorld(worldId: number): void {
    this.world = worldById(worldId)
    const theme = themeById(this.world.themeId)
    buildTextures(this, [theme])
    this.chipRoot.removeAll(true)
    this.mapRoot.removeAll(true)
    this.footerRoot.removeAll(true)

    const chipsWidth = DESIGN_W - 40
    const chipGap = 4
    const chipWidth = (chipsWidth - chipGap * 9) / 10
    WORLDS.forEach((entry, index) => {
      const firstGlobal = (entry.id - 1) * LEVELS_PER_WORLD + 1
      const unlocked = firstGlobal <= this.progress.journey.unlocked
      const selected = entry.id === worldId
      const x = 20 + index * (chipWidth + chipGap)
      const chip = this.add.graphics()
      const accent = Phaser.Display.Color.HexStringToColor(theme.ui.accent).color
      chip.fillStyle(selected ? accent : 0xffffff, selected ? 0.95 : 0.07)
      chip.fillRoundedRect(x, 84, chipWidth, 36, 10)
      chip.lineStyle(1, selected ? accent : 0xffffff, selected ? 1 : 0.12)
      chip.strokeRoundedRect(x, 84, chipWidth, 36, 10)
      this.chipRoot.add(chip)
      const number = label(this, x + chipWidth / 2, 102, unlocked ? `${entry.id}` : '\u2022', 14, selected ? '#071018' : unlocked ? theme.ui.text : theme.ui.muted, {
        origin: 0.5,
        fontStyle: 'bold',
      })
      this.chipRoot.add(number)
      const hit = this.add.rectangle(x + chipWidth / 2, 102, chipWidth, 36, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!unlocked) {
          sound.error()
          toast(this, `Reach level ${firstGlobal} to open ${entry.name}.`, theme)
          return
        }
        sound.select()
        this.buildWorld(entry.id)
      })
      this.chipRoot.add(hit)
    })

    this.chipRoot.add(
      label(this, DESIGN_W / 2, 144, `${this.world.name.toUpperCase()}`, 20, theme.ui.accent, {
        origin: 0.5,
        fontStyle: 'bold',
        letterSpacing: 1.5,
      }),
    )
    this.chipRoot.add(
      label(this, DESIGN_W / 2, 164, this.world.blurb, 11, theme.ui.muted, { origin: 0.5, align: 'center' }),
    )

    const levels = levelsForWorld(worldId)
    const columns = 5
    const rowHeight = 86
    const top = 214
    const left = 96
    const columnGap = 132
    const positions: { x: number; y: number; level: PuzzleLevel }[] = []
    for (let row = 0; row < 10; row += 1) {
      const order = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0]
      order.forEach((column, orderIndex) => {
        const level = levels[row * columns + orderIndex]
        if (!level) return
        positions.push({
          x: left + column * columnGap,
          y: top + row * rowHeight,
          level,
        })
      })
    }

    const path = this.add.graphics()
    for (let index = 1; index < positions.length; index += 1) {
      const from = positions[index - 1]!
      const to = positions[index]!
      const fromGlobal = (worldId - 1) * LEVELS_PER_WORLD + from.level.index
      const done = fromGlobal < this.progress.journey.unlocked
      path.lineStyle(done ? 5 : 3, Phaser.Display.Color.HexStringToColor(theme.ui.accent).color, done ? 0.4 : 0.13)
      path.beginPath()
      path.moveTo(from.x, from.y)
      const midY = (from.y + to.y) / 2
      path.lineTo(from.x, midY)
      path.lineTo(to.x, midY)
      path.lineTo(to.x, to.y)
      path.strokePath()
    }
    this.mapRoot.add(path)

    const accentNumber = Phaser.Display.Color.HexStringToColor(theme.ui.accent).color
    for (const entry of positions) {
      const global = (worldId - 1) * LEVELS_PER_WORLD + entry.level.index
      const unlocked = global <= this.progress.journey.unlocked
      const stars = this.progress.journey.stars[entry.level.id] ?? 0
      const isCurrent = global === this.progress.journey.unlocked
      const size = isCurrent ? 30 : 25

      if (isCurrent) {
        const ring = this.add.circle(entry.x, entry.y, size + 9, accentNumber, 0)
        ring.setStrokeStyle(2, accentNumber, 0.9)
        this.mapRoot.add(ring)
        this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 })
      }

      const circle = this.add.circle(entry.x, entry.y, size, unlocked ? 0x101d3a : 0x121625, 1)
      circle.setStrokeStyle(2.5, stars > 0 ? 0xffce55 : unlocked ? accentNumber : 0x39415c, stars > 0 ? 1 : unlocked ? 0.8 : 0.5)
      this.mapRoot.add(circle)

      this.mapRoot.add(
        label(this, entry.x, entry.y, unlocked ? `${entry.level.index}` : '\u{1F512}', unlocked ? 16 : 13, unlocked ? theme.ui.text : theme.ui.muted, {
          origin: 0.5,
          fontStyle: 'bold',
        }),
      )

      if (stars > 0) {
        this.mapRoot.add(starRow(this, entry.x, entry.y + size + 12, stars, 9, 3))
      }

      if (unlocked) {
        const hit = this.add.circle(entry.x, entry.y, size + 6, 0xffffff, 0)
        hit.setInteractive({ useHandCursor: true })
        hit.on('pointerup', () => {
          sound.select()
          fadeTo(this, 'Game', { mode: 'puzzle', levelId: entry.level.id })
        })
        this.mapRoot.add(hit)
      } else {
        const hit = this.add.circle(entry.x, entry.y, size + 6, 0xffffff, 0)
        hit.setInteractive({ useHandCursor: true })
        hit.on('pointerup', () => {
          sound.error()
          toast(this, `Complete level ${global - 1} first.`, theme)
        })
        this.mapRoot.add(hit)
      }
    }

    const worldLevels = levelsForWorld(worldId)
    const worldStars = worldLevels.reduce((sum, level) => sum + (this.progress.journey.stars[level.id] ?? 0), 0)
    const firstGlobal = (worldId - 1) * LEVELS_PER_WORLD + 1
    const worldUnlocked = firstGlobal <= this.progress.journey.unlocked
    const footer = panel(this, 20, 1094, DESIGN_W - 40, 116, {
      fill: 0x0d1730,
      side: 0x05080f,
      raised: 4,
      stroke: accentNumber,
      strokeAlpha: 0.22,
    })
    this.footerRoot.add(footer)
    this.footerRoot.add(
      label(this, 42, 1112, `${worldStars}/${worldLevels.length * 3} STARS`, 12, theme.ui.accent, { fontStyle: 'bold' }),
    )

    const currentLevel = levelAt(this.progress.journey.unlocked)
    const canPlay = worldUnlocked && currentLevel?.world === worldId
    this.footerRoot.add(
      label(
        this,
        42,
        1140,
        canPlay
          ? `NEXT UP · LEVEL ${currentLevel.index} · ${formatNumber(currentLevel.scoreTarget)} POINTS TO CLEAR`
          : worldStars >= worldLevels.length * 3
            ? 'WORLD MASTERED'
            : 'KEEP CLEARING TO OPEN THIS WORLD',
        12,
        theme.ui.text,
        { fontStyle: 'bold' },
      ),
    )
    this.footerRoot.add(
      label(this, 42, 1164, 'Tap a lit node to play. Score above the goal for more stars.', 10, theme.ui.muted),
    )
    const playButton = button(
      this,
      DESIGN_W - 196,
      1112,
      160,
      56,
      'PLAY',
      () => {
        if (!canPlay || !currentLevel) return
        sound.select()
        fadeTo(this, 'Game', { mode: 'puzzle', levelId: currentLevel.id })
      },
      {
        fill: accentNumber,
        textColor: '#061018',
        size: 18,
        disabled: !canPlay,
      },
    )
    this.footerRoot.add(playButton)

    // A row of theme-coloured blocks above the footer adds world identity.
    for (let index = 0; index < 8; index += 1) {
      const key = blockKey(this.world.themeId, (index % 7) + 1)
      if (!this.textures.exists(key)) continue
      const block = this.add.image(DESIGN_W - 260 + index * 20, 1100, key).setDisplaySize(14, 14).setAlpha(0.5)
      this.footerRoot.add(block)
    }
  }
}
