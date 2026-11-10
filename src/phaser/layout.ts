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
    const header = Math.round(Math.max(138, Math.min(160, height * 0.17)))
    const controls = showTouch ? Math.round(Math.max(118, Math.min(184, height * 0.17))) : 0
    const available = height - header - controls - 16
    const cell = Math.max(10, Math.floor(Math.min((width - 18) / 10, available / 20)))
    const boardW = cell * 10
    const boardH = cell * 20
    const boardX = Math.round((width - boardW) / 2)
    const boardY = Math.round(header + Math.max(0, (available - boardH) / 2))
    const holdSize = Math.min(56, boardW * 0.18)
    const hold = { x: 10, y: header - holdSize - 12, w: holdSize, h: holdSize }
    const next = { x: 10 + holdSize + 10, y: header - holdSize - 12, w: Math.max(90, width - holdSize - 32), h: holdSize }
    let touch: TouchLayout | null = null
    if (showTouch) {
      const pad = 8
      const rowH = (controls - pad * 3) / 2
      touch = {
        row1: buttonRow(4, pad, height - controls + pad, width - pad * 2, rowH, pad),
        row2: buttonRow(3, pad, height - controls + pad * 2 + rowH, width - pad * 2, rowH, pad),
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
      header,
      controls,
      hold,
      next,
      objectiveY: header - 8,
      side: null,
      touch,
    }
  }

  const header = 56
  const controls = showTouch ? Math.max(76, Math.min(104, height * 0.16)) : 0
  const available = height - header - controls - 14
  const cell = Math.max(9, Math.floor(Math.min(available / 20, (width * 0.54) / 10)))
  const boardW = cell * 10
  const boardH = cell * 20
  const boardX = Math.round(Math.max(14, (width * 0.62 - boardW) / 2))
  const boardY = Math.round(header + Math.max(0, (available - boardH) / 2))
  const sideX = boardX + boardW + 14
  const side = { x: sideX, y: header, w: Math.max(120, width - sideX - 12), h: height - header - controls - 10 }
  const holdSize = Math.min(64, side.w * 0.34)
  const hold = { x: sideX + 4, y: header + 136, w: holdSize, h: holdSize }
  const next = {
    x: sideX + 4,
    y: header + 136 + holdSize + 12,
    w: side.w - 8,
    h: Math.max(24, side.h - holdSize - 156),
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
