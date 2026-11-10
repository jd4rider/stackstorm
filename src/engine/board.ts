import { boxSize, shapeCells } from './pieces'
import type { Board, Cell, PieceId, Rotation } from './types'

export function createBoard(cols: number, totalRows: number): Board {
  return Array.from({ length: totalRows }, () => Array<number>(cols).fill(0))
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

export function pieceCells(id: PieceId, rotation: Rotation, x: number, y: number): Cell[] {
  return shapeCells(id, rotation).map((cell) => ({ x: x + cell.x, y: y + cell.y }))
}

export function collides(
  board: Board,
  id: PieceId,
  rotation: Rotation,
  x: number,
  y: number,
  cols: number,
): boolean {
  for (const cell of shapeCells(id, rotation)) {
    const column = x + cell.x
    const row = y + cell.y
    if (column < 0 || column >= cols || row >= board.length) return true
    if (row >= 0 && board[row]![column] !== 0) return true
  }
  return false
}

export function lockPiece(board: Board, id: PieceId, rotation: Rotation, x: number, y: number, value: number): Cell[] {
  const cells = pieceCells(id, rotation, x, y)
  for (const cell of cells) {
    if (cell.y >= 0 && cell.y < board.length && cell.x >= 0 && cell.x < board[0]!.length) {
      board[cell.y]![cell.x] = value
    }
  }
  return cells
}

export function fullRows(board: Board, fromRow = 0): number[] {
  const rows: number[] = []
  for (let row = fromRow; row < board.length; row += 1) {
    if (board[row]!.every((cell) => cell !== 0)) rows.push(row)
  }
  return rows
}

export function removeRows(board: Board, rows: number[]): void {
  if (rows.length === 0) return
  const cols = board[0]!.length
  const remove = new Set(rows)
  const kept = board.filter((_, row) => !remove.has(row))
  while (kept.length < board.length) kept.unshift(Array<number>(cols).fill(0))
  for (let row = 0; row < board.length; row += 1) board[row] = kept[row]!
}

export function isBoardEmpty(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === 0))
}

/** The visible 20-row slice of a board that may include hidden spawn rows. */
export function visibleSlice(board: Board, hiddenRows: number): Board {
  return board.slice(hiddenRows).map((row) => [...row])
}

/** Build a full board with `hiddenRows` empty rows above a 20-row puzzle setup. */
export function boardFromVisible(visible: Board, cols: number, hiddenRows: number): Board {
  const board = createBoard(cols, visible.length + hiddenRows)
  for (let row = 0; row < visible.length; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      board[row + hiddenRows]![column] = visible[row]?.[column] ?? 0
    }
  }
  return board
}

export function occupiedAbove(board: Board, hiddenRows: number): boolean {
  for (let row = 0; row < hiddenRows; row += 1) {
    if (board[row]!.some((cell) => cell !== 0)) return true
  }
  return false
}

export function dropDistance(
  board: Board,
  id: PieceId,
  rotation: Rotation,
  x: number,
  y: number,
  cols: number,
): number {
  let distance = 0
  while (!collides(board, id, rotation, x, y + distance + 1, cols)) distance += 1
  return distance
}

export function footprintColumns(id: PieceId, rotation: Rotation, x: number): number[] {
  const width = boxSize(id)
  const columns = new Set<number>()
  for (const cell of shapeCells(id, rotation)) {
    if (cell.x >= 0 && cell.x < width) columns.add(x + cell.x)
  }
  return [...columns]
}
