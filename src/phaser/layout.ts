export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface TouchLayout {
  row1: Rect[]
  row2: Rect[]
  landscape: boolean
}

export interface GameLayout {
  width: number
  height: number
  portrait: boolean
  cell: number
  boardX: number
  boardY: number
  boardW: number
  boardH: number
  header: number
  controls: number
  hold: Rect
  next: Rect
  objectiveY: number
  side: Rect | null
  touch: TouchLayout | null
}

function buttonRow(count: number, x: number, y: number, width: number, height: number, gap: number): Rect[] {
  const size = (width - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, index) => ({
    x: x + index * (size + gap),
    y,
    w: size,
    h: height,
  }))
}

export function computeLayout(width: number, height: number, showTouch: boolean): GameLayout {
  const portrait = height >= width * 0.92

  if (portrait) {
    // The score sits in a slim top bar, HOLD/NEXT ride just beneath it, and a
    // single row of touch buttons leaves the rest of the screen for the well.
    const topBar = Math.round(Math.max(54, Math.min(66, height * 0.066)))
    const holdSize = 52
    const boardTop = topBar + holdSize + 4
    const controls = showTouch ? Math.round(Math.max(64, Math.min(76, height * 0.08))) : 0
    const available = height - boardTop - controls - 4
    const cell = Math.max(11, Math.floor(Math.min((width - 8) / 10, available / 20)))
    const boardW = cell * 10
    const boardH = cell * 20
    const boardX = Math.round((width - boardW) / 2)
    const boardY = Math.round(boardTop + Math.max(0, (available - boardH) / 2))
    const hold = { x: 8, y: topBar - 2, w: holdSize, h: holdSize }
    const next = {
      x: 8 + holdSize + 8,
      y: topBar - 2,
      w: Math.max(100, width - (8 + holdSize + 8) - 8),
      h: holdSize,
    }
    let touch: TouchLayout | null = null
    if (showTouch) {
      const pad = 6
      // The arcade account bubble sits in the very bottom-left corner, under
      // the strip. A small gutter keeps the left arrow clear of it while still
      // putting the arrows at opposite ends of the screen.
      const gutter = 56
      touch = {
        row1: buttonRow(7, gutter, height - controls + pad, width - gutter - pad, controls - pad * 2, 5),
        row2: [],
        landscape: false,
      }
    }
    return {
      width,
      height,
      portrait,
      cell,
      boardX,
      boardY,
      boardW,
      boardH,
      header: boardTop,
      controls,
      hold,
      next,
      objectiveY: boardY,
      side: null,
      touch,
    }
  }

  // Landscape is a compact arcade cabinet: board and side rail are centred
  // together instead of being pushed to opposite edges of a wide monitor.
  const header = 48
  const controls = showTouch ? Math.max(64, Math.min(88, height * 0.12)) : 0
  const available = height - header - controls - 8
  const cell = Math.max(9, Math.floor(Math.min(available / 20, (width * 0.6) / 10)))
  const boardW = cell * 10
  const boardH = cell * 20
  const sideW = Math.max(210, Math.min(300, width * 0.24))
  const gap = 14
  const cabinetW = boardW + gap + sideW
  const boardX = Math.round(Math.max(10, (width - cabinetW) / 2))
  const boardY = Math.round(header + Math.max(0, (available - boardH) / 2))
  const sideX = boardX + boardW + gap
  const side = { x: sideX, y: boardY, w: sideW, h: boardH }
  const holdSize = Math.min(68, sideW * 0.3)
  const hold = { x: sideX + 6, y: boardY + 94, w: holdSize, h: holdSize }
  const next = {
    x: sideX + 6,
    y: hold.y + holdSize + 14,
    w: side.w - 12,
    h: Math.max(150, Math.min(330, boardH - holdSize - 130)),
  }
  let touch: TouchLayout | null = null
  if (showTouch) {
    const pad = 7
    const heightRow = controls - pad * 2
    touch = {
      row1: buttonRow(7, pad, height - controls + pad, width - pad * 2, heightRow, pad),
      row2: [],
      landscape: true,
    }
  }
  return {
    width,
    height,
    portrait,
    cell,
    boardX,
    boardY,
    boardW,
    boardH,
    header,
    controls,
    hold,
    next,
    objectiveY: header - 6,
    side,
    touch,
  }
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
}
