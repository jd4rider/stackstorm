import {
  boardFromVisible,
  cloneBoard,
  collides,
  createBoard,
  dropDistance,
  fullRows,
  isBoardEmpty,
  lockPiece,
  pieceCells,
  removeRows,
} from './board'
import { kicksFor, spawnX } from './pieces'
import { SevenBag } from './rng'
import {
  PUZZLE_GRAVITY_MS,
  SPRINT_GRAVITY_MS,
  STORM_SURGE_MS,
  STORM_THRESHOLD,
  TIME_ATTACK_GRAVITY_MS,
  comboPoints,
  gravityForLevel,
  linePoints,
  perfectClearPoints,
  stormCharge,
} from './scoring'
import {
  INDEX_PIECE,
  PIECE_INDEX,
  type ActivePiece,
  type Board,
  type ClearResult,
  type EngineEvent,
  type EngineOptions,
  type EngineSnapshot,
  type EngineStatus,
  type PieceId,
  type Rotation,
} from './types'

const PREVIEW_LENGTH = 6

function cornersOccupied(board: Board, x: number, y: number, cols: number): number {
  const corners = [
    { x, y },
    { x: x + 2, y },
    { x, y: y + 2 },
    { x: x + 2, y: y + 2 },
  ]
  let occupied = 0
  for (const corner of corners) {
    if (corner.x < 0 || corner.x >= cols || corner.y >= board.length) {
      occupied += 1
      continue
    }
    if (corner.y >= 0 && board[corner.y]![corner.x] !== 0) occupied += 1
  }
  return occupied
}

export class StackstormEngine {
  readonly mode: EngineOptions['mode']
  readonly cols: number
  readonly visibleRows: number
  readonly hiddenRows: number
  readonly totalRows: number

  board: Board
  status: EngineStatus = 'ready'
  active: ActivePiece | null = null

  score = 0
  lines = 0
  level: number
  combo = 0
  maxCombo = 0
  b2b = 0
  pieces = 0
  fourLines = 0
  tspins = 0
  perfectClears = 0
  elapsedMs = 0

  hold: PieceId | null = null
  holdUsed = false

  queue: PieceId[] = []
  previewCount = 5

  grounded = false
  lockProgress = 0

  stormMeter = 0
  stormRemainingMs = 0

  timeRemainingMs: number | null

  private bag: SevenBag
  private readonly fixedQueue: boolean
  private readonly startLevel: number
  private readonly linesTarget: number | null
  private readonly timeLimitMs: number | null
  private readonly gravityOverride: number | null
  private readonly lockDelayMs: number
  private readonly maxLockResets: number
  private readonly dasMs: number
  private readonly arrMs: number
  private readonly softDropMs: number
  private readonly clearDurationMs: number

  private gravityMs: number
  private dropAcc = 0
  private lockTimer = 0
  private lockResets = 0
  private softDrop = false

  private direction: -1 | 0 | 1 = 0
  private dasTimer = 0
  private arrTimer = 0

  private clearTimer = 0
  private pendingClear: ClearResult | null = null
  private lastRotationTspin = false

  private previousStatus: EngineStatus = 'playing'
  private events: EngineEvent[] = []

  constructor(options: EngineOptions) {
    this.mode = options.mode
    this.cols = options.cols ?? 10
    this.visibleRows = options.visibleRows ?? 20
    this.hiddenRows = options.hiddenRows ?? 4
    this.totalRows = this.visibleRows + this.hiddenRows

    this.board = options.board
      ? boardFromVisible(options.board, this.cols, this.hiddenRows)
      : createBoard(this.cols, this.totalRows)

    this.startLevel = options.startLevel ?? 1
    this.level = this.startLevel
    this.linesTarget = options.linesTarget ?? null
    this.timeLimitMs = options.timeLimitMs ?? null
    this.timeRemainingMs = this.timeLimitMs

    this.gravityOverride = options.gravityMs ?? null
    if (this.mode === 'sprint') this.gravityMs = SPRINT_GRAVITY_MS
    else if (this.mode === 'timeattack') this.gravityMs = TIME_ATTACK_GRAVITY_MS
    else if (this.mode === 'puzzle') this.gravityMs = PUZZLE_GRAVITY_MS
    else this.gravityMs = this.gravityOverride ?? gravityForLevel(this.level)

    this.lockDelayMs = options.lockDelayMs ?? 500
    this.maxLockResets = options.maxLockResets ?? 15
    this.dasMs = options.dasMs ?? 150
    this.arrMs = options.arrMs ?? 30
    this.softDropMs = options.softDropMs ?? 25
    this.clearDurationMs = options.clearMs ?? 300

    this.fixedQueue = Boolean(options.queue)
    this.bag = new SevenBag(options.seed ?? 1)
    if (options.queue) {
      this.queue = [...options.queue]
    } else {
      this.fillBagQueue()
    }
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    if (this.status !== 'ready') return
    this.status = 'playing'
    this.spawnNext()
  }

  pause(): void {
    if (this.status === 'playing' || this.status === 'clearing') {
      this.previousStatus = this.status
      this.status = 'paused'
    }
  }

  resume(): void {
    if (this.status === 'paused') this.status = this.previousStatus
  }

  drainEvents(): EngineEvent[] {
    const drained = this.events
    this.events = []
    return drained
  }

  snapshot(): EngineSnapshot {
    return {
      status: this.status,
      score: this.score,
      lines: this.lines,
      level: this.level,
      combo: this.combo,
      maxCombo: this.maxCombo,
      b2b: this.b2b,
      pieces: this.pieces,
      elapsedMs: this.elapsedMs,
      timeRemainingMs: this.timeRemainingMs,
      stormMeter: this.stormMeter,
      stormActive: this.stormRemainingMs > 0,
      stormRemainingMs: this.stormRemainingMs,
      grounded: this.grounded,
      lockProgress: this.lockProgress,
      lockResets: this.lockResets,
    }
  }

  // -------------------------------------------------------------------- input

  setDirection(direction: -1 | 0 | 1): void {
    if (!this.canAct()) return
    if (this.direction === direction) return
    this.direction = direction
    if (direction !== 0) {
      this.tryMove(direction)
      this.dasTimer = this.dasMs
      this.arrTimer = this.arrMs
    }
  }

  /** A single deliberate tap, independent of DAS bookkeeping. */
  move(direction: -1 | 1): boolean {
    if (!this.canAct()) return false
    return this.tryMove(direction)
  }

  rotate(direction: 1 | -1): boolean {
    if (!this.canAct() || !this.active) return false
    const from = this.active.rotation
    const to = (((from + direction + 4) % 4) as Rotation)
    const kicks = kicksFor(this.active.id, from, to)
    for (let index = 0; index < kicks.length; index += 1) {
      const kick = kicks[index]!
      const x = this.active.x + kick.x
      const y = this.active.y + kick.y
      if (!collides(this.board, this.active.id, to, x, y, this.cols)) {
        this.active = { ...this.active, rotation: to, x, y }
        this.lastRotationTspin =
          this.active.id === 'T' && cornersOccupied(this.board, this.active.x, this.active.y, this.cols) >= 3
        this.afterSuccessfulMove()
        this.events.push({ type: 'rotate', kick: index })
        return true
      }
    }
    return false
  }

  softDropStep(): boolean {
    if (!this.canAct() || !this.active) return false
    if (collides(this.board, this.active.id, this.active.rotation, this.active.x, this.active.y + 1, this.cols)) {
      return false
    }
    this.active = { ...this.active, y: this.active.y + 1 }
    this.score += 1
    this.lastRotationTspin = false
    this.lockTimer = 0
    this.dropAcc = 0
    this.grounded = false
    this.events.push({ type: 'softDrop', cells: 1 })
    return true
  }

  setSoftDrop(active: boolean): void {
    this.softDrop = active
    if (active) this.dropAcc = 0
  }

  hardDrop(): number {
    if (!this.canAct() || !this.active) return 0
    const distance = dropDistance(
      this.board,
      this.active.id,
      this.active.rotation,
      this.active.x,
      this.active.y,
      this.cols,
    )
    if (distance > 0) {
      this.active = { ...this.active, y: this.active.y + distance }
      this.score += distance * 2
    }
    const cells = this.cellsOf(this.active)
    this.events.push({ type: 'hardDrop', distance, cells, piece: this.active.id })
    this.lockActive()
    return distance
  }

  holdPiece(): boolean {
    if (this.mode === 'puzzle' || !this.canAct() || !this.active || this.holdUsed) return false
    const current = this.active.id
    const swapped = this.hold
    this.hold = current
    this.holdUsed = true
    this.events.push({ type: 'hold', held: current, swapped })
    if (swapped) this.spawnPiece(swapped)
    else this.spawnNext()
    return true
  }

  activateStorm(): boolean {
    if (this.mode !== 'storm' || !this.canAct()) return false
    if (this.stormMeter < STORM_THRESHOLD || this.stormRemainingMs > 0) return false
    this.stormMeter = 0
    this.stormRemainingMs = STORM_SURGE_MS
    this.events.push({ type: 'stormMeter', meter: 0 })
    this.events.push({ type: 'stormSurge', active: true })
    return true
  }

  // --------------------------------------------------------------------- tick

  update(deltaMs: number): void {
    if (this.status !== 'playing' && this.status !== 'clearing') return
    const delta = Math.max(0, Math.min(deltaMs, 100))
    this.elapsedMs += delta

    if (this.timeLimitMs !== null) {
      this.timeRemainingMs = Math.max(0, (this.timeRemainingMs ?? 0) - delta)
      if (this.timeRemainingMs <= 0) {
        this.endGame('time')
        return
      }
    }

    if (this.stormRemainingMs > 0) {
      this.stormRemainingMs = Math.max(0, this.stormRemainingMs - delta)
      if (this.stormRemainingMs === 0) this.events.push({ type: 'stormSurge', active: false })
    }

    if (this.status === 'clearing') {
      this.clearTimer -= delta
      if (this.clearTimer <= 0) this.resolveClear()
      return
    }

    this.updateDAS(delta)
    this.updateGravity(delta)
  }

  private updateDAS(delta: number): void {
    const direction = this.direction
    if (direction === 0) return
    if (this.dasTimer > 0) {
      this.dasTimer -= delta
      if (this.dasTimer <= 0) {
        this.tryMove(direction)
        this.arrTimer = this.arrMs
      }
      return
    }
    this.arrTimer -= delta
    let guard = 0
    while (this.arrTimer <= 0 && guard < 12) {
      if (!this.tryMove(direction)) {
        this.arrTimer = this.arrMs
        break
      }
      this.arrTimer += Math.max(16, this.arrMs)
      guard += 1
    }
  }

  private updateGravity(delta: number): void {
    if (!this.active) return
    this.grounded = this.isGrounded()
    this.lockProgress = Math.min(1, this.lockTimer / this.lockDelayMs)

    if (this.grounded) {
      this.dropAcc = 0
      this.lockTimer += delta
      this.lockProgress = Math.min(1, this.lockTimer / this.lockDelayMs)
      if (this.lockTimer >= this.lockDelayMs) this.lockActive()
      return
    }

    this.lockTimer = 0
    this.lockProgress = 0
    this.dropAcc += delta
    const interval = this.softDrop ? Math.min(this.softDropMs, this.gravityMs) : this.gravityMs
    let steps = 0
    while (this.dropAcc >= interval && steps < 40) {
      this.dropAcc -= interval
      steps += 1
      if (this.isGrounded()) break
      this.active = { ...this.active, y: this.active.y + 1 }
      this.lastRotationTspin = false
      if (this.softDrop) this.score += 1
    }
    if (this.isGrounded()) {
      this.grounded = true
      this.lockTimer = 0
      this.lockProgress = 0
      this.dropAcc = 0
    }
  }

  // ----------------------------------------------------------------- internals

  private canAct(): boolean {
    return this.status === 'playing' && this.active !== null
  }

  private isGrounded(): boolean {
    if (!this.active) return false
    return collides(
      this.board,
      this.active.id,
      this.active.rotation,
      this.active.x,
      this.active.y + 1,
      this.cols,
    )
  }

  private tryMove(direction: -1 | 1): boolean {
    if (!this.active) return false
    const x = this.active.x + direction
    if (collides(this.board, this.active.id, this.active.rotation, x, this.active.y, this.cols)) return false
    this.active = { ...this.active, x }
    this.lastRotationTspin = false
    this.afterSuccessfulMove()
    this.events.push({ type: 'move' })
    return true
  }

  private afterSuccessfulMove(): void {
    if (!this.active) return
    if (this.isGrounded()) {
      this.resetLockDelay()
    } else {
      this.lockTimer = 0
      this.lockProgress = 0
      this.grounded = false
    }
  }

  /**
   * The post-landing slide window: a successful move or rotation while the piece
   * is resting on the stack restarts the lock timer, up to a bounded number of
   * resets. This is the moment that lets a player nudge a tetramino into place.
   */
  private resetLockDelay(): void {
    if (this.lockResets >= this.maxLockResets) return
    this.lockResets += 1
    this.lockTimer = 0
    this.lockProgress = 0
    this.grounded = true
  }

  private spawnNext(): void {
    if (this.queue.length === 0) {
      if (this.fixedQueue) {
        this.endGame('pieces')
        return
      }
      this.fillBagQueue()
    }
    const id = this.queue.shift()!
    this.fillBagQueue()
    this.spawnPiece(id)
  }

  private spawnPiece(id: PieceId): void {
    // Spawn just inside the visible well so a piece is on screen immediately.
    // Puzzle boards with stone in their top row fall back to the hidden buffer.
    const x = spawnX(id)
    let y = this.hiddenRows - 1
    if (collides(this.board, id, 0, x, y, this.cols)) y = 0
    this.active = { id, rotation: 0, x, y }
    this.lockTimer = 0
    this.lockResets = 0
    this.lockProgress = 0
    this.dropAcc = 0
    this.lastRotationTspin = false
    this.grounded = this.isGrounded()
    if (collides(this.board, id, 0, this.active.x, this.active.y, this.cols)) {
      this.active = null
      this.endGame('blockout')
      return
    }
    this.events.push({ type: 'spawn', piece: id })
  }

  private fillBagQueue(): void {
    if (this.fixedQueue) return
    while (this.queue.length < PREVIEW_LENGTH) this.queue.push(this.bag.next())
  }

  private lockActive(): void {
    if (!this.active) return
    const { id, rotation, x, y } = this.active
    const cells = lockPiece(this.board, id, rotation, x, y, PIECE_INDEX[id])
    const tspin = this.lastRotationTspin
    this.pieces += 1
    this.tspins += tspin ? 1 : 0
    this.events.push({ type: 'lock', piece: id, cells, row: Math.min(...cells.map((cell) => cell.y)) })
    this.active = null
    this.holdUsed = false
    this.grounded = false

    const rows = fullRows(this.board)
    if (rows.length > 0) {
      this.beginClear(rows, tspin)
      return
    }
    this.combo = 0
    if (this.goalReached()) return
    this.spawnNext()
  }

  private beginClear(rows: number[], tspin: boolean): void {
    const lines = rows.length
    const surge = this.stormRemainingMs > 0
    const difficult = tspin || lines === 4
    const b2bActive = difficult && this.b2b > 0
    let points = linePoints(lines, this.level, tspin, b2bActive, surge)

    if (this.combo > 0) this.combo += 1
    else this.combo = 1
    this.comboActiveSet(true)
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    points += comboPoints(this.combo, this.level, surge)

    const preview = cloneBoard(this.board)
    removeRows(preview, rows)
    const perfect = isBoardEmpty(preview)
    if (perfect) points += perfectClearPoints(lines, this.level, surge)

    this.score += points
    this.fourLines += lines === 4 ? 1 : 0
    this.b2b = difficult ? this.b2b + 1 : 0

    if (this.mode === 'storm') {
      const gain = stormCharge(lines, tspin, perfect)
      this.stormMeter = Math.min(STORM_THRESHOLD, this.stormMeter + gain)
      this.events.push({ type: 'stormMeter', meter: this.stormMeter })
    }

    this.events.push({
      type: 'clear',
      rows,
      lines,
      points,
      tspin,
      b2b: b2bActive,
      combo: this.combo,
      perfect,
      level: this.level,
    })

    this.pendingClear = { rows, lines, points, tspin, b2b: b2bActive, combo: this.combo, perfect }
    this.clearTimer = this.clearDurationMs
    this.status = 'clearing'
  }

  private comboActiveSet(_active: boolean): void {
    // Combo state is encoded by this.combo; kept as a named hook for clarity.
  }

  private resolveClear(): void {
    const pending = this.pendingClear
    if (!pending) return
    removeRows(this.board, pending.rows)
    this.lines += pending.lines
    if (pending.perfect) this.perfectClears += 1
    this.pendingClear = null
    this.clearTimer = 0
    this.status = 'playing'
    this.updateLevel()
    if (this.goalReached()) return
    this.spawnNext()
  }

  private updateLevel(): void {
    if (this.mode !== 'marathon' && this.mode !== 'storm') return
    const next = Math.min(99, this.startLevel + Math.floor(this.lines / 10))
    if (next > this.level) {
      this.level = next
      if (this.gravityOverride === null) this.gravityMs = gravityForLevel(this.level)
      this.events.push({ type: 'levelUp', level: this.level })
    }
  }

  private goalReached(): boolean {
    if (this.linesTarget === null) return false
    if (this.lines < this.linesTarget) return false
    this.status = 'won'
    this.events.push({ type: 'win', reason: this.mode === 'puzzle' ? 'objective' : 'lines' })
    return true
  }

  private endGame(reason: 'blockout' | 'time' | 'pieces'): void {
    if (this.status === 'over' || this.status === 'won') return
    this.status = 'over'
    this.direction = 0
    this.softDrop = false
    this.events.push({ type: 'gameOver', reason })
  }

  private cellsOf(piece: ActivePiece) {
    return pieceCells(piece.id, piece.rotation, piece.x, piece.y)
  }

  // ------------------------------------------------------- builder / test hook

  /**
   * Replace the active piece at a chosen rotation and column. This is the same
   * code path the level builder and replay tests use to prove a stored solution
   * is reachable; it is never bound to player input.
   */
  setActive(id: PieceId, rotation: Rotation, x: number, y = 0): boolean {
    if (collides(this.board, id, rotation, x, y, this.cols)) return false
    this.active = { id, rotation, x, y }
    this.lockTimer = 0
    this.lockResets = 0
    this.lockProgress = 0
    this.dropAcc = 0
    this.lastRotationTspin = false
    this.grounded = this.isGrounded()
    return true
  }

  cellValue(id: PieceId): number {
    return PIECE_INDEX[id]
  }

  pieceAt(index: number): PieceId {
    return INDEX_PIECE[index - 1] ?? 'I'
  }
}
