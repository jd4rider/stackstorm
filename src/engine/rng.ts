import { PIECE_IDS, type PieceId } from './types'

/** Mulberry32: small, fast and fully reproducible from a 32-bit seed. */
export function makeRng(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffledBag(random: () => number): PieceId[] {
  const bag = [...PIECE_IDS]
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const temporary = bag[index]!
    bag[index] = bag[swap]!
    bag[swap] = temporary
  }
  return bag
}

/**
 * Deterministic seven-bag randomizer. Every run of seven pieces contains each
 * tetromino exactly once, so there are no arbitrary long droughts.
 */
export class SevenBag {
  private readonly random: () => number
  private bag: PieceId[] = []

  constructor(seed = 1) {
    this.random = makeRng(seed)
  }

  next(): PieceId {
    if (this.bag.length === 0) this.bag = shuffledBag(this.random)
    return this.bag.shift()!
  }

  peek(count: number): PieceId[] {
    while (this.bag.length < count) this.bag.push(...shuffledBag(this.random))
    return this.bag.slice(0, count)
  }
}
