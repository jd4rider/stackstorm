import Phaser from 'phaser'
import type { Theme } from '../config/themes'
import type { StackstormEngine } from '../engine/engine'
import type { GameMode } from '../engine/types'
import { formatClock, formatNumber, label, panel } from './common'
import type { GameLayout } from './layout'
import { PiecePreview } from './BoardRenderer'

export interface HudInfo {
  mode: GameMode
  targetLines: number
  levelName?: string
}

export class Hud {
  private readonly scene: Phaser.Scene
  private theme: Theme
  private layout: GameLayout
  private readonly onPause: () => void
  private readonly onSurge: () => void
  private readonly root: Phaser.GameObjects.Container
  private readonly scoreText: Phaser.GameObjects.Text
  private readonly modeText: Phaser.GameObjects.Text
  private readonly metaText: Phaser.GameObjects.Text
  private readonly objectiveText: Phaser.GameObjects.Text
  private readonly comboText: Phaser.GameObjects.Text
  private readonly holdLabel: Phaser.GameObjects.Text
  private readonly nextLabel: Phaser.GameObjects.Text
  private readonly holdPanel: Phaser.GameObjects.Container
  private readonly nextPanel: Phaser.GameObjects.Container
  private readonly holdPreview: PiecePreview
  private readonly nextPreviews: PiecePreview[] = []
  private readonly stormBar: Phaser.GameObjects.Graphics
  private readonly surgeButton: Phaser.GameObjects.Container
  private readonly pauseButton: Phaser.GameObjects.Container
  private info: HudInfo
  private previewSignature = ''
  private lastScore = -1
  private lastMeta = ''
  private lastObjective = ''
  private lastCombo = -1

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    layout: GameLayout,
    info: HudInfo,
    onPause: () => void,
    onSurge: () => void,
  ) {
    this.scene = scene
    this.theme = theme
    this.layout = layout
    this.info = info
    this.onPause = onPause
    this.onSurge = onSurge
    this.root = scene.add.container(0, 0).setDepth(30)

    const accent = theme.ui.accent
    this.scoreText = label(scene, 0, 0, '0', 32, theme.ui.text, { origin: 0.5, fontStyle: 'bold' })
    this.modeText = label(scene, 0, 0, '', 12, accent, { fontStyle: 'bold', letterSpacing: 1.4 })
    this.metaText = label(scene, 0, 0, '', 12, theme.ui.muted, { origin: [1, 0] })
    this.objectiveText = label(scene, 0, 0, '', 13, theme.ui.text, { origin: 0.5, align: 'center' })
    this.comboText = label(scene, 0, 0, '', 20, accent, { origin: 0.5, fontStyle: 'bold', alpha: 0 })
    this.holdLabel = label(scene, 0, 0, 'HOLD', 9, theme.ui.muted, { fontStyle: 'bold' })
    this.nextLabel = label(scene, 0, 0, 'NEXT', 9, theme.ui.muted, { fontStyle: 'bold' })
    this.holdPanel = panel(scene, 0, 0, 10, 10, { radius: 12, fill: 0x0b1226, side: 0x05070f, raised: 2, strokeAlpha: 0.15 })
    this.nextPanel = panel(scene, 0, 0, 10, 10, { radius: 12, fill: 0x0b1226, side: 0x05070f, raised: 2, strokeAlpha: 0.15 })
    this.holdPreview = new PiecePreview(scene, this.holdPanel, 12)
    for (let index = 0; index < 5; index += 1) this.nextPreviews.push(new PiecePreview(scene, this.nextPanel, 10))
    this.stormBar = scene.add.graphics()
    this.surgeButton = scene.add.container(0, 0)
    this.pauseButton = scene.add.container(0, 0)

    this.root.add([
      this.scoreText,
      this.modeText,
      this.metaText,
      this.objectiveText,
      this.comboText,
      this.holdPanel,
      this.nextPanel,
      this.holdLabel,
      this.nextLabel,
      this.stormBar,
      this.surgeButton,
      this.pauseButton,
    ])

    this.buildPauseButton()
    this.buildSurgeButton()
    this.setLayout(layout)
  }

  private buildPauseButton(): void {
    const size = 38
    const graphics = this.scene.add.graphics()
    graphics.fillStyle(0x0b1226, 0.8)
    graphics.fillRoundedRect(-size / 2, -size / 2, size, size, 12)
    graphics.lineStyle(1, 0xffffff, 0.15)
    graphics.strokeRoundedRect(-size / 2, -size / 2, size, size, 12)
    graphics.fillStyle(0xffffff, 0.85)
    graphics.fillRoundedRect(-6, -8, 4, 16, 2)
    graphics.fillRoundedRect(2, -8, 4, 16, 2)
    this.pauseButton.add(graphics)
    const hit = this.scene.add.rectangle(0, 0, size, size, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', this.onPause)
    this.pauseButton.add(hit)
  }

  private buildSurgeButton(): void {
    const graphics = this.scene.add.graphics()
    graphics.fillStyle(0xfbbf24, 1)
    graphics.fillRoundedRect(-46, -14, 92, 28, 14)
    graphics.fillStyle(0xffffff, 0.22)
    graphics.fillRoundedRect(-42, -11, 84, 10, 7)
    this.surgeButton.add(graphics)
    this.surgeButton.add(label(this.scene, 0, 0, 'SURGE', 12, '#231a04', { origin: 0.5, fontStyle: 'bold' }))
    const hit = this.scene.add.rectangle(0, 0, 92, 32, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', this.onSurge)
    this.surgeButton.add(hit)
    this.surgeButton.setVisible(false)
    this.surgeButton.setDepth(40)
  }

  setTheme(theme: Theme): void {
    this.theme = theme
    this.scoreText.setColor(theme.ui.text)
    this.modeText.setColor(theme.ui.accent)
    this.metaText.setColor(theme.ui.muted)
    this.objectiveText.setColor(theme.ui.text)
    this.comboText.setColor(theme.ui.accent)
    this.holdLabel.setColor(theme.ui.muted)
    this.nextLabel.setColor(theme.ui.muted)
    this.lastScore = -1
    this.lastMeta = ''
    this.lastObjective = ''
    this.previewSignature = ''
  }

  setLayout(layout: GameLayout): void {
    this.layout = layout
    const portrait = layout.portrait
    if (portrait) {
      this.scoreText.setPosition(layout.width / 2, 18)
      this.modeText.setPosition(10, 8)
      this.metaText.setPosition(layout.width - 46, 9)
      this.objectiveText.setPosition(layout.width / 2, 46)
      this.pauseButton.setPosition(layout.width - 26, 24)
      this.comboText.setPosition(layout.width / 2, layout.boardY + 22)
      this.holdLabel.setPosition(layout.hold.x, layout.hold.y - 10)
      this.nextLabel.setPosition(layout.next.x, layout.next.y - 10)
      this.holdPanel.setPosition(layout.hold.x, layout.hold.y)
      this.nextPanel.setPosition(layout.next.x, layout.next.y)
      this.stormBar.setPosition(layout.width / 2 - 70, 34)
      this.surgeButton.setPosition(layout.width / 2, 46)
    } else {
      const side = layout.side!
      this.scoreText.setPosition(side.x + side.w / 2, layout.header + 22)
      this.modeText.setPosition(14, 10)
      this.metaText.setPosition(layout.width - 56, 11)
      this.objectiveText.setPosition(side.x + side.w / 2, layout.header + 52)
      this.pauseButton.setPosition(layout.width - 26, 26)
      this.comboText.setPosition(layout.boardX + layout.boardW / 2, layout.boardY + 24)
      this.holdLabel.setPosition(layout.hold.x, layout.hold.y - 10)
      this.nextLabel.setPosition(layout.next.x, layout.next.y - 10)
      this.holdPanel.setPosition(layout.hold.x, layout.hold.y)
      this.nextPanel.setPosition(layout.next.x, layout.next.y)
      this.stormBar.setPosition(side.x + side.w / 2 - 70, layout.header + 72)
      this.surgeButton.setPosition(side.x + side.w / 2, layout.header + 52)
    }
    this.surgeButton.setVisible(false)
    this.previewSignature = ''
  }

  update(engine: StackstormEngine): void {
    if (engine.score !== this.lastScore) {
      this.lastScore = engine.score
      this.scoreText.setText(formatNumber(engine.score))
    }
    const lines = engine.lines
    const target = this.info.targetLines
    let meta = `LV ${engine.level}  ·  ${lines} LINES`
    if (this.info.mode === 'sprint') meta = `${lines}/${target}  ·  ${formatClock(engine.elapsedMs)}`
    else if (this.info.mode === 'timeattack') meta = `${formatClock(engine.timeRemainingMs ?? 0)}  ·  ${lines} LINES`
    else if (this.info.mode === 'puzzle') meta = `${lines}/${target}  ·  ${engine.queue.length + (engine.active ? 1 : 0)} PIECES`
    if (meta !== this.lastMeta) {
      this.lastMeta = meta
      this.metaText.setText(meta)
    }

    let objective = ''
    if (this.info.mode === 'puzzle') {
      objective = `CLEAR ${target} LINES`
      if (this.info.levelName) objective = `${this.info.levelName.toUpperCase()}  ·  CLEAR ${target}`
    } else if (this.info.mode === 'sprint') {
      objective = 'CLEAR 40 LINES AS FAST AS YOU CAN'
    } else if (this.info.mode === 'timeattack') {
      objective = 'TWO MINUTES — SCORE AS MUCH AS YOU CAN'
    } else if (this.info.mode === 'storm') {
      objective = engine.stormRemainingMs > 0 ? 'SURGE ACTIVE — DOUBLE POINTS' : 'CHARGE THE STORM METER'
    } else {
      objective = 'MARATHON — EVERY TEN LINES RAISES THE LEVEL'
    }
    if (objective !== this.lastObjective) {
      this.lastObjective = objective
      this.objectiveText.setText(objective)
    }

    this.modeText.setText(
      this.info.mode === 'timeattack'
        ? 'TIME ATTACK'
        : this.info.mode === 'sprint'
          ? 'SPRINT'
          : this.info.mode === 'storm'
            ? 'STORM MODE'
            : this.info.mode === 'puzzle'
              ? 'PUZZLE JOURNEY'
              : 'MARATHON',
    )

    if (engine.combo !== this.lastCombo) {
      this.lastCombo = engine.combo
      if (engine.combo >= 2) {
        this.comboText.setText(`COMBO ×${engine.combo}`).setAlpha(1).setScale(1)
        this.scene.tweens.add({ targets: this.comboText, scale: 1.12, duration: 90, yoyo: true })
      } else {
        this.comboText.setAlpha(0)
      }
    }

    this.stormBar.clear()
    if (this.info.mode === 'storm') {
      const width = 160
      const meter = engine.stormMeter / 100
      const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
      const gold = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent2).color
      this.stormBar.fillStyle(0xffffff, 0.12)
      this.stormBar.fillRoundedRect(0, 0, width, 8, 4)
      this.stormBar.fillStyle(engine.stormRemainingMs > 0 ? gold : accent, 0.95)
      this.stormBar.fillRoundedRect(0, 0, Math.max(3, width * meter), 8, 4)
      if (engine.stormRemainingMs > 0) {
        this.stormBar.fillStyle(0xffffff, 0.2)
        this.stormBar.fillRoundedRect(0, 0, Math.max(3, width * meter), 3, 2)
      }
    }

    const ready = this.info.mode === 'storm' && engine.stormMeter >= 100 && engine.stormRemainingMs <= 0
    this.surgeButton.setVisible(ready)
    this.objectiveText.setVisible(!ready)
    if (ready) {
      const pulse = 1 + Math.sin(this.scene.time.now / 180) * 0.04
      this.surgeButton.setScale(pulse)
    }

    const signature = `${engine.active?.id ?? '-'}|${engine.hold ?? '-'}|${engine.queue.slice(0, 5).join('')}`
    if (signature !== this.previewSignature) {
      this.previewSignature = signature
      this.refreshPreviews(engine)
    }
  }

  private refreshPreviews(engine: StackstormEngine): void {
    const mini = this.layout.portrait
      ? Math.max(6, Math.min(13, this.layout.hold.h * 0.22))
      : Math.max(6, Math.min(13, this.layout.hold.w * 0.2))
    this.holdPreview.setCell(mini)
    this.holdPreview.show(engine.hold ?? null, this.theme, engine.hold ? 1 : 0.25)
    this.holdPreview.setPosition(this.layout.hold.w / 2, this.layout.hold.h / 2)

    const count = this.nextPreviews.length
    this.nextPreviews.forEach((preview, index) => {
      preview.setCell(Math.max(5, mini * 0.8))
      preview.show(engine.queue[index] ?? null, this.theme, index === 0 ? 1 : 0.8)
      if (this.layout.portrait) {
        const spacing = this.layout.next.w / count
        preview.setPosition(spacing * (index + 0.5), this.layout.next.h / 2)
      } else if (this.layout.next.h < 220) {
        const spacing = this.layout.next.w / count
        preview.setPosition(spacing * (index + 0.5), this.layout.next.h / 2)
      } else {
        const spacing = Math.min(this.layout.next.h / count, 58)
        preview.setPosition(this.layout.next.w / 2, spacing * (index + 0.5))
      }
    })
  }

  destroy(): void {
    this.root.destroy(true)
  }
}
