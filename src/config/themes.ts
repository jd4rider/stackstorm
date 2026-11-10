import type { PieceId } from '../engine/types'

export interface ThemeUi {
  bgTop: string
  bgBottom: string
  panel: string
  panelEdge: string
  text: string
  muted: string
  accent: string
  accent2: string
  good: string
  danger: string
  grid: string
}

export interface Theme {
  id: string
  name: string
  description: string
  starsRequired: number
  style: 'gloss' | 'pixel' | 'glass'
  background: 'neon' | 'candy' | 'crystal' | 'pixel' | 'cosmic' | 'ocean' | 'gold' | 'rainbow'
  pieces: Record<PieceId, number>
  stone: number
  ui: ThemeUi
}

export const THEMES: Theme[] = [
  {
    id: 'neon',
    name: 'Neon Arcade',
    description: 'Ice, amethyst and ember on a midnight cabinet.',
    starsRequired: 0,
    style: 'gloss',
    background: 'neon',
    pieces: {
      I: 0x18d8ff,
      O: 0xffd400,
      T: 0xb02bff,
      S: 0x00e070,
      Z: 0xff2d55,
      J: 0x2f6bff,
      L: 0xff9500,
    },
    stone: 0x3d476a,
    ui: {
      bgTop: '#080d21',
      bgBottom: '#1b1140',
      panel: '#111a38',
      panelEdge: '#2b3a66',
      text: '#f2f6ff',
      muted: '#93a0c6',
      accent: '#67f6ff',
      accent2: '#a855f7',
      good: '#34d399',
      danger: '#ff4d6d',
      grid: '#1b2850',
    },
  },
  {
    id: 'candy',
    name: 'Candy Pop',
    description: 'Sherbet light and soft sugar dust.',
    starsRequired: 12,
    style: 'gloss',
    background: 'candy',
    pieces: {
      I: 0x7dd3fc,
      O: 0xffd166,
      T: 0xf472b6,
      S: 0x86efac,
      Z: 0xfb7185,
      J: 0x818cf8,
      L: 0xfbbf24,
    },
    stone: 0x7a3a5f,
    ui: {
      bgTop: '#2a0e26',
      bgBottom: '#6b1d46',
      panel: '#42132f',
      panelEdge: '#7c2a55',
      text: '#fff4fb',
      muted: '#e3a8c8',
      accent: '#ff9ed2',
      accent2: '#ffd166',
      good: '#86efac',
      danger: '#fb7185',
      grid: '#55203b',
    },
  },
  {
    id: 'crystal',
    name: 'Crystal Storm',
    description: 'Cool refracted highlights in a deep cavern.',
    starsRequired: 30,
    style: 'glass',
    background: 'crystal',
    pieces: {
      I: 0x67e8f9,
      O: 0xfde68a,
      T: 0xc4b5fd,
      S: 0x6ee7b7,
      Z: 0xfda4af,
      J: 0x93c5fd,
      L: 0xfdba74,
    },
    stone: 0x2d5560,
    ui: {
      bgTop: '#08222c',
      bgBottom: '#13384a',
      panel: '#0e2c36',
      panelEdge: '#245566',
      text: '#effcff',
      muted: '#8db9c4',
      accent: '#7ef0d0',
      accent2: '#c4b5fd',
      good: '#6ee7b7',
      danger: '#fda4af',
      grid: '#163c4a',
    },
  },
  {
    id: 'retro',
    name: 'Retro Pixel',
    description: 'Hard edges, saturated colour, no apologies.',
    starsRequired: 60,
    style: 'pixel',
    background: 'pixel',
    pieces: {
      I: 0x00f0f0,
      O: 0xf0f000,
      T: 0xa000f0,
      S: 0x00f000,
      Z: 0xf00000,
      J: 0x0000f0,
      L: 0xf0a000,
    },
    stone: 0x4d4d66,
    ui: {
      bgTop: '#0b0b12',
      bgBottom: '#1a1a2e',
      panel: '#161622',
      panelEdge: '#3c3c58',
      text: '#ffffff',
      muted: '#b9b9d0',
      accent: '#00f0f0',
      accent2: '#f0f000',
      good: '#00f000',
      danger: '#f00000',
      grid: '#26263a',
    },
  },
  {
    id: 'cosmic',
    name: 'Cosmic Energy',
    description: 'Nebula drift and violet starlight.',
    starsRequired: 100,
    style: 'glass',
    background: 'cosmic',
    pieces: {
      I: 0x60a5fa,
      O: 0xfcd34d,
      T: 0xd8b4fe,
      S: 0x6ee7b7,
      Z: 0xf9a8d4,
      J: 0x818cf8,
      L: 0xfdba74,
    },
    stone: 0x4b3a6b,
    ui: {
      bgTop: '#0d0620',
      bgBottom: '#2a1152',
      panel: '#160b30',
      panelEdge: '#41276b',
      text: '#f8f5ff',
      muted: '#b4a3d1',
      accent: '#c4b5fd',
      accent2: '#60a5fa',
      good: '#6ee7b7',
      danger: '#f9a8d4',
      grid: '#241343',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Glass',
    description: 'Deep water, sea glass and slow light.',
    starsRequired: 150,
    style: 'glass',
    background: 'ocean',
    pieces: {
      I: 0x5eead4,
      O: 0xfde68a,
      T: 0x93c5fd,
      S: 0x34d399,
      Z: 0xfca5a5,
      J: 0x60a5fa,
      L: 0xfcd34d,
    },
    stone: 0x2b5a5e,
    ui: {
      bgTop: '#031c26',
      bgBottom: '#064a52',
      panel: '#062b33',
      panelEdge: '#17616a',
      text: '#effcff',
      muted: '#8fbec2',
      accent: '#5eead4',
      accent2: '#93c5fd',
      good: '#34d399',
      danger: '#fca5a5',
      grid: '#0d3c44',
    },
  },
  {
    id: 'gold',
    name: 'Golden Circuit',
    description: 'Brass traces and warm electric light.',
    starsRequired: 220,
    style: 'gloss',
    background: 'gold',
    pieces: {
      I: 0xfef3c7,
      O: 0xfbbf24,
      T: 0xf59e0b,
      S: 0xa3e635,
      Z: 0xfb7185,
      J: 0x60a5fa,
      L: 0xf97316,
    },
    stone: 0x6b5426,
    ui: {
      bgTop: '#14100a',
      bgBottom: '#33230b',
      panel: '#221a0e',
      panelEdge: '#5c451a',
      text: '#fffaf0',
      muted: '#c7b084',
      accent: '#fbbf24',
      accent2: '#a3e635',
      good: '#a3e635',
      danger: '#fb7185',
      grid: '#3a2a11',
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow Rush',
    description: 'The whole spectrum at full voltage.',
    starsRequired: 300,
    style: 'gloss',
    background: 'rainbow',
    pieces: {
      I: 0x22d3ee,
      O: 0xfacc15,
      T: 0xc084fc,
      S: 0x4ade80,
      Z: 0xf87171,
      J: 0x60a5fa,
      L: 0xfb923c,
    },
    stone: 0x57406b,
    ui: {
      bgTop: '#120a1f',
      bgBottom: '#3a0f3f',
      panel: '#1d1030',
      panelEdge: '#54266b',
      text: '#fff8ff',
      muted: '#c1a8d6',
      accent: '#f0abfc',
      accent2: '#67f6ff',
      good: '#4ade80',
      danger: '#f87171',
      grid: '#2c1546',
    },
  },
]

export const DEFAULT_THEME_ID = 'neon'

export function themeById(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!
}

export function themesForStars(stars: number): Theme[] {
  return THEMES.filter((theme) => theme.starsRequired <= stars)
}

export function isThemeUnlocked(theme: Theme, stars: number): boolean {
  return stars >= theme.starsRequired
}
