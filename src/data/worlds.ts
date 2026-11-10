export interface World {
  id: number
  name: string
  subtitle: string
  themeId: string
  /** Base colour of the stone walls built into this world's puzzle boards. */
  stone: string
  from: string
  to: string
  accent: string
  blurb: string
}

export const WORLDS: World[] = [
  {
    id: 1,
    name: 'Neon Beginnings',
    subtitle: 'First light on the grid',
    themeId: 'neon',
    stone: '#3f4a70',
    from: '#101a3f',
    to: '#2b1e5c',
    accent: '#67f6ff',
    blurb: 'Warm up the wells. One clean drop is all it takes.',
  },
  {
    id: 2,
    name: 'Candy Voltage',
    subtitle: 'Sweet current, sharp timing',
    themeId: 'candy',
    stone: '#7a3a5f',
    from: '#3a1230',
    to: '#7c2350',
    accent: '#ff8fc7',
    blurb: 'The wells get wider and the pieces get curious.',
  },
  {
    id: 3,
    name: 'Crystal Cavern',
    subtitle: 'Light bends underground',
    themeId: 'crystal',
    stone: '#2f5a68',
    from: '#0c2733',
    to: '#173f52',
    accent: '#7ef0d0',
    blurb: 'Two wells, one stack. Keep every column honest.',
  },
  {
    id: 4,
    name: 'Electric City',
    subtitle: 'The grid never sleeps',
    themeId: 'city',
    stone: '#2b3550',
    from: '#101a2e',
    to: '#20355c',
    accent: '#ffd166',
    blurb: 'Decoy pieces crowd the skyline. Plan before you drop.',
  },
  {
    id: 5,
    name: 'Ocean Glow',
    subtitle: 'Pressure and patience',
    themeId: 'ocean',
    stone: '#2b5f63',
    from: '#04222e',
    to: '#0b4650',
    accent: '#5eead4',
    blurb: 'Double-width wells reward a steady hand.',
  },
  {
    id: 6,
    name: 'Ember Factory',
    subtitle: 'Everything runs hot',
    themeId: 'ember',
    stone: '#6b3520',
    from: '#2b1208',
    to: '#5c2410',
    accent: '#ff9b54',
    blurb: 'Three bands of stone and almost no margin.',
  },
  {
    id: 7,
    name: 'Frozen Circuit',
    subtitle: 'Precision at zero',
    themeId: 'frost',
    stone: '#33526b',
    from: '#0d2233',
    to: '#244f6b',
    accent: '#a5f3fc',
    blurb: 'Two wells at once. Mind the shared sky.',
  },
  {
    id: 8,
    name: 'Cosmic Drift',
    subtitle: 'Gravity, gently bent',
    themeId: 'cosmic',
    stone: '#513c73',
    from: '#1a1033',
    to: '#3b1d5c',
    accent: '#c4b5fd',
    blurb: 'Longer sequences, fewer second chances.',
  },
  {
    id: 9,
    name: 'Thunder Temple',
    subtitle: 'Every drop is a prayer',
    themeId: 'thunder',
    stone: '#63491d',
    from: '#231a0b',
    to: '#4a3413',
    accent: '#fde68a',
    blurb: 'Fill the wells without sealing your own route.',
  },
  {
    id: 10,
    name: 'Eye of the Storm',
    subtitle: 'The last calm minute',
    themeId: 'storm',
    stone: '#4f2456',
    from: '#170a24',
    to: '#3b0f3f',
    accent: '#f0abfc',
    blurb: 'The final fifty. Everything you have learned.',
  },
]

export function worldById(id: number): World {
  return WORLDS[Math.min(WORLDS.length - 1, Math.max(0, id - 1))]!
}

export function worldForLevel(index: number): number {
  // 500 levels, fifty per world.
  return Math.min(WORLDS.length, Math.floor((index - 1) / 50) + 1)
}
