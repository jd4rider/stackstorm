import Phaser from 'phaser'
import { themeById, type Theme } from '../config/themes'
import { worldById } from '../data/worlds'
import { sound } from '../core/audio'
import { loadProgress, recordJourneyLevel, recordRun, type Progress, type Settings } from '../core/saves'
import { StackstormEngine } from '../engine/engine'
import { SHAPES } from '../engine/pieces'
import { puzzleStars } from '../engine/scoring'
import type { GameMode } from '../engine/types'
import { arcade } from '../integration/LittleJoyAdapter'
import { levelById, nextLevel } from '../puzzles/levels'
import type { PuzzleLevel } from '../puzzles/types'
import { BoardRenderer } from './BoardRenderer'
import { EffectsManager } from './Effects'
import { Hud } from './Hud'
import { TouchControls, type ControlAction } from './TouchControls'
import { backdrop, button, fadeIn, fadeTo, label, panel, display } from './common'
import { computeLayout, isCoarsePointer, type GameLayout } from './layout'
import { ensureStoneTexture } from './textures'

export interface GameData {
  mode: GameMode
  levelId?: string
  seed?: number
}

export interface RunOutcome {
  mode: GameMode
  won: boolean
  score: number
  lines: number
  level: number
  pieces: number
  fourLines: number
  tspins: number
  maxCombo: number
  elapsedMs: number
  perfectClears: number
  stars: number
  levelId?: string
  levelName?: string
  nextLevelId?: string
  previousBest: number
  newBest: boolean
  previousStars: number
  newAchievements: string[]
}

export class GameScene extends Phaser.Scene {
  private engine!: StackstormEngine
  private progress!: Progress
  private settings!: Settings
  private theme!: Theme
  private layout!: GameLayout
  private boardRenderer!: BoardRenderer
  private hud!: Hud
  private effects!: EffectsManager
  private touch: TouchControls | null = null
  private level: PuzzleLevel | undefined
  private mode: GameMode = 'marathon'
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private lastDirection: -1 | 0 | 1 = 0
  private softDown = false
  private finished = false
  private paused = false
  private pauseOverlay: Phaser.GameObjects.Container | null = null
  private stormActivations = 0
  private lastTickSecond = -1
  private visibilityHandler: (() => void) | null = null
  private resizeHandler: (() => void) | null = null

  constructor() {
    super('Game')
  }

  create(data: GameData): void {
    this.mode = data.mode
    // Phaser reuses the scene instance between runs, so every per-run field has
    // to be reset here. Leaving `finished` set from the previous run made a
    // freshly started level sit frozen: update() bailed on its first line and
    // every button was ignored.
    this.finished = false
    this.paused = false
    this.lastDirection = 0
    this.softDown = false
    this.stormActivations = 0
    this.lastTickSecond = -1
    this.pauseOverlay = null
    this.touch = null
    this.progress = loadProgress()
    this.settings = this.progress.settings
    this.theme = themeById(this.settings.themeId)
    this.level = data.levelId ? levelById(data.levelId) : undefined
    const seed = data.seed ?? (Date.now() & 0x7fffffff)

    sound.setVolumes(
      this.settings.masterVolume,
      this.settings.musicVolume,
      this.settings.sfxVolume,
      this.settings.muted,
    )
    sound.setMusicWanted(this.settings.musicVolume > 0 && !this.settings.muted)
    sound.duck(false)
    sound.setMusicMode(
      this.mode === 'storm'
        ? 'storm'
        : this.mode === 'sprint'
          ? 'sprint'
          : this.mode === 'timeattack'
            ? 'timeattack'
            : this.mode === 'puzzle'
              ? 'puzzle'
              : 'marathon',
    )

    backdrop(this, this.theme)
    this.input.addPointer(3)
    this.input.keyboard?.addCapture('SPACE,UP,DOWN,LEFT,RIGHT')

    const showTouch = isCoarsePointer() && this.settings.touchButtons && !this.settings.gestures
    this.layout = computeLayout(this.scale.width, this.scale.height, showTouch)

    const options = this.engineOptions(seed)
    this.engine = new StackstormEngine(options)
    this.engine.start()

    this.boardRenderer = new BoardRenderer(this, this.theme, this.layout)
    this.boardRenderer.setHighContrast(this.settings.highContrast)
    this.boardRenderer.setWells(this.wellColumns())
    if (this.mode === 'puzzle' && this.level) {
      // Every world builds its walls from its own rock.
      const world = worldById(this.level.world)
      this.boardRenderer.setStone(
        ensureStoneTexture(this, this.theme, world.id, Phaser.Display.Color.HexStringToColor(world.stone).color),
      )
    }
    this.effects = new EffectsManager(
      this,
      this.theme,
      this.settings.quality,
      this.settings.reducedMotion,
      this.settings.shake,
    )
    this.hud = new Hud(
      this,
      this.theme,
      this.layout,
      {
        mode: this.mode,
        targetLines: this.mode === 'sprint' ? 40 : this.mode === 'puzzle' ? this.level?.linesTarget ?? 4 : 0,
        levelName: this.level?.name,
      },
      () => this.togglePause(),
      () => this.activateStorm(),
    )
    this.hud.update(this.engine)

    if (showTouch) {
      this.touch = new TouchControls(
        this,
        this.theme,
        (action) => this.pressControl(action),
        (action) => this.releaseControl(action),
      )
      this.touch.setLayout(this.layout)
    }

    if (this.settings.gestures) this.installGestures()
    this.showLevelHint()

    const keyboard = this.input.keyboard
    if (keyboard) {
      this.keys = keyboard.addKeys({
        left: 'LEFT',
        right: 'RIGHT',
        down: 'DOWN',
        up: 'UP',
        space: 'SPACE',
        z: 'Z',
        x: 'X',
        c: 'C',
        shift: 'SHIFT',
        escape: 'ESC',
        p: 'P',
        s: 'S',
        enter: 'ENTER',
      }) as Record<string, Phaser.Input.Keyboard.Key>
    }

    this.installResize()
    this.installVisibility()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    fadeIn(this)
  }

  /** Columns that are completely empty on a puzzle board: the lanes to fill. */
  private wellColumns(): number[] {
    if (this.mode !== 'puzzle' || !this.level) return []
    const columns: number[] = []
    for (let column = 0; column < 10; column += 1) {
      if (this.level.board.every((row) => (row[column] ?? 0) === 0)) columns.push(column)
    }
    return columns
  }

  /** A short, non-blocking nudge on the opening Journey levels. */
  private showLevelHint(): void {
    if (!this.level || this.level.world !== 1 || this.level.index > 3) return
    const lanes = this.wellColumns().length
    const text =
      lanes <= 1
        ? 'SPIN THE I, THEN DROP IT IN THE LIT LANE'
        : 'FILL EVERY LIT LANE WITH A VERTICAL I'
    const width = Math.min(this.layout.boardW - 18, 320)
    const height = 58
    const accent = Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color
    const overlay = this.add
      .container(
        this.layout.boardX + (this.layout.boardW - width) / 2,
        this.layout.boardY + this.layout.boardH * 0.34,
      )
      .setDepth(45)
    overlay.add(
      panel(this, 0, 0, width, height, {
        fill: 0x0b1428,
        side: 0x05070f,
        raised: 4,
        radius: 16,
        stroke: accent,
        strokeAlpha: 0.55,
      }),
    )
    overlay.add(
      label(this, width / 2, 11, 'HINT', 9, this.theme.ui.accent, {
        origin: 0.5,
        fontStyle: 'bold',
        letterSpacing: 1.8,
      }),
    )
    overlay.add(label(this, width / 2, 31, text, 11, this.theme.ui.text, { origin: 0.5, align: 'center' }))
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 700,
      delay: 5200,
      onComplete: () => overlay.destroy(true),
    })
  }

  private engineOptions(seed: number): ConstructorParameters<typeof StackstormEngine>[0] {
    const base = {
      mode: this.mode,
      seed,
      dasMs: this.settings.dasMs,
      arrMs: Math.max(0, this.settings.arrMs),
    }
    if (this.mode === 'puzzle' && this.level) {
      return {
        ...base,
        board: this.level.board,
        queue: this.level.sequence,
        linesTarget: this.level.linesTarget,
        lockDelayMs: 700,
        maxLockResets: 20,
      }
    }
    if (this.mode === 'sprint') return { ...base, linesTarget: 40 }
    if (this.mode === 'timeattack') return { ...base, timeLimitMs: 120_000 }
    return base
  }

  // ------------------------------------------------------------------- input

  private installGestures(): void {
    let start: { x: number; y: number; time: number } | null = null
    let pointers = 0

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointers += 1
      if (this.paused || this.finished) return
      if (pointers > 1) {
        if (this.engine.holdPiece()) sound.hold()
        start = null
        return
      }
      if (pointer.y < this.layout.header) return
      start = { x: pointer.x, y: pointer.y, time: this.time.now }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointers = Math.max(0, pointers - 1)
      if (!start || this.paused || this.finished) {
        start = null
        return
      }
      const dx = pointer.x - start.x
      const dy = pointer.y - start.y
      const elapsed = this.time.now - start.time
      start = null
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14 && elapsed < 320) {
        if (this.engine.rotate(1)) sound.rotate()
        return
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
        const steps = Math.min(4, Math.max(1, Math.round(Math.abs(dx) / (this.layout.cell * 1.2))))
        for (let index = 0; index < steps; index += 1) this.engine.move(dx > 0 ? 1 : -1)
        sound.move()
        return
      }
      if (dy > 24) {
        if (elapsed < 180 && dy > this.layout.cell * 1.4) {
          this.engine.hardDrop()
        } else {
          this.engine.softDropStep()
          this.engine.softDropStep()
        }
      }
    })
  }

  private pressControl(action: ControlAction): void {
    if (this.finished) return
    if (this.paused) return
    switch (action) {
      case 'left':
        this.engine.setDirection(-1)
        break
      case 'right':
        this.engine.setDirection(1)
        break
      case 'soft':
        this.engine.setSoftDrop(true)
        break
      case 'ccw':
        if (this.engine.rotate(-1)) sound.rotate()
        break
      case 'cw':
        if (this.engine.rotate(1)) sound.rotate()
        break
      case 'drop':
        this.engine.hardDrop()
        break
      case 'hold':
        if (this.engine.holdPiece()) sound.hold()
        break
    }
  }

  private releaseControl(action: ControlAction): void {
    if (action === 'left' || action === 'right') this.engine.setDirection(0)
    if (action === 'soft') this.engine.setSoftDrop(false)
  }

  private handleKeys(): void {
    if (!this.keys) return
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape) || Phaser.Input.Keyboard.JustDown(this.keys.p)) {
      this.togglePause()
      return
    }
    if (this.paused || this.finished) return

    const left = this.keys.left.isDown
    const right = this.keys.right.isDown
    const direction: -1 | 0 | 1 = left && !right ? -1 : right && !left ? 1 : 0
    if (direction !== this.lastDirection) {
      this.lastDirection = direction
      this.engine.setDirection(direction)
    }

    const soft = this.keys.down.isDown
    if (soft !== this.softDown) {
      this.softDown = soft
      this.engine.setSoftDrop(soft)
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.engine.hardDrop()
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.x)) {
      if (this.engine.rotate(1)) sound.rotate()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
      if (this.engine.rotate(-1)) sound.rotate()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.c) || Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
      if (this.engine.holdPiece()) sound.hold()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.s)) this.activateStorm()
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) && this.engine.status === 'over') this.finish(false)
  }

  private activateStorm(): void {
    if (this.engine.activateStorm()) {
      this.stormActivations += 1
    } else if (this.mode === 'storm' && this.engine.stormMeter < 100) {
      sound.error()
    }
  }

  // -------------------------------------------------------------------- loop

  override update(_time: number, delta: number): void {
    if (!this.engine || this.finished) return
    this.handleKeys()
    this.engine.update(delta)
    this.drainEvents()
    this.boardRenderer.sync(this.engine)
    this.hud.update(this.engine)

    if (this.mode === 'timeattack') {
      const remaining = this.engine.timeRemainingMs ?? 0
      if (remaining <= 10_000 && remaining > 0) {
        const second = Math.ceil(remaining / 1000)
        if (second !== this.lastTickSecond) {
          this.lastTickSecond = second
          sound.softDrop()
        }
      }
    }

    if (this.engine.status === 'over') this.finish(false)
    else if (this.engine.status === 'won') this.finish(true)
  }

  private drainEvents(): void {
    for (const event of this.engine.drainEvents()) {
      switch (event.type) {
        case 'move':
          break
        case 'rotate':
          sound.rotate()
          break
        case 'softDrop':
          break
        case 'lock':
          sound.lock()
          break
        case 'hardDrop':
          this.effects.hardDrop(event.piece, event.cells, this.layout, this.engine.hiddenRows)
          sound.hardDrop()
          break
        case 'spawn': {
          const active = this.engine.active
          if (active) {
            const cells = SHAPES[active.id][active.rotation].map((cell) => ({
              x: active.x + cell.x,
              y: active.y + cell.y,
            }))
            this.effects.spawn(cells, event.piece, this.layout, this.engine.hiddenRows)
          }
          break
        }
        case 'hold':
          sound.hold()
          break
        case 'clear': {
          const isStormBreak = event.lines >= 4
          if (isStormBreak) sound.stormBreak()
          else sound.clear(event.lines)
          if (event.combo >= 2) sound.combo(event.combo)
          this.effects.clear(
            {
              rows: event.rows,
              lines: event.lines,
              tspin: event.tspin,
              perfect: event.perfect,
              combo: event.combo,
              points: event.points,
            },
            this.layout,
            this.engine.hiddenRows,
          )
          break
        }
        case 'levelUp':
          sound.levelUp()
          this.effects.levelUp(event.level)
          break
        case 'stormMeter':
          if (event.meter >= 100) sound.achievement()
          break
        case 'stormSurge':
          this.effects.surge(event.active)
          if (event.active) sound.storm()
          break
        case 'gameOver':
          sound.lose()
          break
        case 'win':
          sound.win()
          break
      }
    }
  }

  // ---------------------------------------------------------------- finishing

  private finish(won: boolean): void {
    if (this.finished) return
    this.finished = true
    this.engine.setDirection(0)
    this.engine.setSoftDrop(false)
    this.touch?.setVisible(false)
    this.lastDirection = 0

    const engine = this.engine
    const beforeAchievements = new Set(this.progress.achievements)
    const previousStars = this.level ? this.progress.journey.stars[this.level.id] ?? 0 : 0
    let stars = 0
    let nextLevelId: string | undefined
    let previousBest = 0
    let newBest = false

    if (this.mode === 'puzzle' && this.level) {
      if (won) {
        stars = puzzleStars(engine.elapsedMs, { goldMs: this.level.goldMs, parMs: this.level.parMs })
        this.progress = recordJourneyLevel(this.progress, this.level, stars, engine.elapsedMs)
        nextLevelId = nextLevel(this.level)?.id
        newBest = stars > previousStars
      }
    } else {
      if (this.mode === 'marathon') previousBest = this.progress.best.marathon
      else if (this.mode === 'storm') previousBest = this.progress.best.storm
      else if (this.mode === 'timeattack') previousBest = this.progress.best.timeattack
      else if (this.mode === 'sprint') previousBest = this.progress.best.sprintMs
      this.progress = recordRun(this.progress, {
        mode: this.mode,
        score: engine.score,
        lines: engine.lines,
        level: engine.level,
        pieces: engine.pieces,
        fourLines: engine.fourLines,
        tspins: engine.tspins,
        maxCombo: engine.maxCombo,
        elapsedMs: engine.elapsedMs,
        perfectClears: engine.perfectClears,
        storms: this.stormActivations,
      })
      if (this.mode === 'sprint') {
        newBest = won && engine.lines >= 40 && (previousBest === 0 || engine.elapsedMs < previousBest)
      } else {
        newBest = engine.score > previousBest && engine.score > 0
      }
    }

    const newAchievements = this.progress.achievements.filter((id) => !beforeAchievements.has(id))
    void arcade.sync('stackstorm-run')
    void arcade.push()

    const outcome: RunOutcome = {
      mode: this.mode,
      won,
      score: engine.score,
      lines: engine.lines,
      level: engine.level,
      pieces: engine.pieces,
      fourLines: engine.fourLines,
      tspins: engine.tspins,
      maxCombo: engine.maxCombo,
      elapsedMs: engine.elapsedMs,
      perfectClears: engine.perfectClears,
      stars,
      levelId: this.level?.id,
      levelName: this.level?.name,
      nextLevelId,
      previousBest,
      newBest,
      previousStars,
      newAchievements,
    }

    this.time.delayedCall(won ? 900 : 1000, () => {
      this.scene.start('Results', outcome)
    })
  }

  // -------------------------------------------------------------- pause / ui

  private togglePause(): void {
    if (this.finished) return
    if (this.paused) this.resumeGame()
    else if (this.engine.status === 'playing' || this.engine.status === 'clearing') this.pauseGame()
  }

  private pauseGame(): void {
    if (this.paused || this.finished) return
    this.paused = true
    this.engine.pause()
    this.engine.setDirection(0)
    this.engine.setSoftDrop(false)
    this.lastDirection = 0
    this.softDown = false
    sound.pause()
    sound.duck(true)
    this.touch?.setVisible(false)
    this.showPauseOverlay()
  }

  private resumeGame(): void {
    if (!this.paused) return
    this.paused = false
    this.engine.resume()
    sound.duck(false)
    this.touch?.setVisible(true)
    this.pauseOverlay?.destroy(true)
    this.pauseOverlay = null
  }

  private showPauseOverlay(): void {
    this.pauseOverlay?.destroy(true)
    const width = this.scale.width
    const height = this.scale.height
    const overlay = this.add.container(0, 0).setDepth(200)
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x03050c, 0.78)
    dim.setInteractive()
    overlay.add(dim)
    const panelWidth = Math.min(460, width - 48)
    const panelHeight = 380
    const card = panel(this, (width - panelWidth) / 2, (height - panelHeight) / 2, panelWidth, panelHeight, {
      fill: 0x0d1730,
      side: 0x05080f,
      raised: 6,
      radius: 26,
      stroke: Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color,
      strokeAlpha: 0.3,
    })
    overlay.add(card)
    overlay.add(
      display(this, width / 2, height / 2 - 132, 'PAUSED', 40, this.theme.ui.text, 0.5),
    )
    overlay.add(
      label(this, width / 2, height / 2 - 92, 'Take a breath. The stack will wait.', 12, this.theme.ui.muted, {
        origin: 0.5,
      }),
    )
    const buttonWidth = panelWidth - 64
    const x = (width - buttonWidth) / 2
    const startY = height / 2 - 42
    overlay.add(
      button(this, x, startY, buttonWidth, 54, 'RESUME', () => this.resumeGame(), {
        fill: Phaser.Display.Color.HexStringToColor(this.theme.ui.accent).color,
        textColor: '#061018',
        size: 18,
        silent: true,
      }),
    )
    overlay.add(
      button(this, x, startY + 66, buttonWidth, 54, 'RESTART', () => this.restartRun(), {
        fill: 0x233256,
        size: 17,
        silent: true,
      }),
    )
    overlay.add(
      button(this, x, startY + 132, buttonWidth, 54, 'QUIT TO MENU', () => this.quitToMenu(), {
        fill: 0x3a1b2b,
        size: 17,
        silent: true,
      }),
    )
    overlay.add(
      label(this, width / 2, height / 2 + 160, 'ESC / P TO RESUME', 10, this.theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.6,
      }),
    )
    this.pauseOverlay = overlay
  }

  private restartRun(): void {
    sound.duck(false)
    this.scene.restart({
      mode: this.mode,
      levelId: this.level?.id,
      seed: (Date.now() & 0x7fffffff) ^ 0x5f3759df,
    } satisfies GameData)
  }

  private quitToMenu(): void {
    sound.duck(false)
    fadeTo(this, 'Menu')
  }

  // ---------------------------------------------------------- layout / cleanup

  private installResize(): void {
    this.resizeHandler = () => {
      const showTouch = isCoarsePointer() && this.settings.touchButtons && !this.settings.gestures
      this.layout = computeLayout(this.scale.width, this.scale.height, showTouch)
      this.boardRenderer.setLayout(this.layout)
      this.hud.setLayout(this.layout)
      this.touch?.setLayout(this.layout)
      if (this.paused) this.showPauseOverlay()
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler)
  }

  private installVisibility(): void {
    this.visibilityHandler = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        if (this.engine.status === 'playing' || this.engine.status === 'clearing') this.pauseGame()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  private cleanup(): void {
    if (this.resizeHandler) this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler)
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.touch?.destroy()
    this.hud?.destroy()
    this.effects?.destroy()
    this.boardRenderer?.destroy()
    this.pauseOverlay?.destroy(true)
    sound.duck(false)
  }

}
