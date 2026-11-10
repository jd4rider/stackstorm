import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { sound } from '../core/audio'
import { loadProgress, saveProgress, updateSettings, type Progress, type Quality } from '../core/saves'
import { backdrop, button, fadeIn, fadeTo, header, label, panel, stage, toast, DESIGN_W } from './common'

interface RowSpec {
  label: string
  hint: string
  value: () => string
  cycle: (direction: 1 | -1) => void
}

export class SettingsScene extends Phaser.Scene {
  private progress!: Progress
  private rows: RowSpec[] = []
  private valueTexts: Phaser.GameObjects.Text[] = []
  private content!: Phaser.GameObjects.Container

  constructor() {
    super('Settings')
  }

  create(): void {
    this.progress = loadProgress()
    const theme = themeById(this.progress.settings.themeId)
    backdrop(this, theme)
    const root = stage(this)
    header(this, root, 'SETTINGS', () => fadeTo(this, 'Menu'), theme)
    root.add(
      label(this, DESIGN_W / 2, 78, 'EVERYTHING SAVES AS YOU CHANGE IT', 10, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.6,
      }),
    )
    this.content = this.add.container(0, 0)
    root.add(this.content)
    this.buildRows()
    this.addReset(root)
    fadeIn(this)
  }

  private patch(patch: Parameters<typeof updateSettings>[1]): void {
    this.progress = updateSettings(this.progress, patch)
    const settings = this.progress.settings
    sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.muted)
    sound.setMusicWanted(settings.musicVolume > 0 && !settings.muted)
    this.refreshValues()
  }

  private refreshValues(): void {
    this.rows.forEach((row, index) => this.valueTexts[index]?.setText(row.value()))
  }

  private buildRows(): void {
    const theme = themeById(this.progress.settings.themeId)
    this.content.removeAll(true)
    this.rows = []
    this.valueTexts = []

    const rows: RowSpec[] = [
      {
        label: 'MASTER VOLUME',
        hint: 'Overall loudness',
        value: () => `${Math.round(this.progress.settings.masterVolume * 100)}%`,
        cycle: (direction) =>
          this.patch({ masterVolume: clamp(this.progress.settings.masterVolume + direction * 0.1, 0, 1) }),
      },
      {
        label: 'MUSIC',
        hint: 'The synth soundtrack',
        value: () => `${Math.round(this.progress.settings.musicVolume * 100)}%`,
        cycle: (direction) =>
          this.patch({ musicVolume: clamp(this.progress.settings.musicVolume + direction * 0.1, 0, 1) }),
      },
      {
        label: 'SOUND EFFECTS',
        hint: 'Drops, clears and storms',
        value: () => `${Math.round(this.progress.settings.sfxVolume * 100)}%`,
        cycle: (direction) => this.patch({ sfxVolume: clamp(this.progress.settings.sfxVolume + direction * 0.1, 0, 1) }),
      },
      {
        label: 'MUTE',
        hint: 'Silence everything',
        value: () => (this.progress.settings.muted ? 'ON' : 'OFF'),
        cycle: () => this.patch({ muted: !this.progress.settings.muted }),
      },
      {
        label: 'GRAPHICS QUALITY',
        hint: 'Particle density and effects',
        value: () => this.progress.settings.quality.toUpperCase(),
        cycle: (direction) => {
          const order: Quality[] = ['low', 'medium', 'high']
          const index = order.indexOf(this.progress.settings.quality)
          const next = order[(index + direction + order.length) % order.length]!
          this.patch({ quality: next })
        },
      },
      {
        label: 'GHOST PIECE',
        hint: 'Show where the piece will land',
        value: () => (this.progress.settings.ghost ? 'ON' : 'OFF'),
        cycle: () => this.patch({ ghost: !this.progress.settings.ghost }),
      },
      {
        label: 'SCREEN SHAKE',
        hint: 'Impact and storm shake',
        value: () => (this.progress.settings.shake ? 'ON' : 'OFF'),
        cycle: () => this.patch({ shake: !this.progress.settings.shake }),
      },
      {
        label: 'REDUCED MOTION',
        hint: 'Fewer flashes and no shake',
        value: () => (this.progress.settings.reducedMotion ? 'ON' : 'OFF'),
        cycle: () => this.patch({ reducedMotion: !this.progress.settings.reducedMotion }),
      },
      {
        label: 'HIGH CONTRAST',
        hint: 'Stronger grid and block edges',
        value: () => (this.progress.settings.highContrast ? 'ON' : 'OFF'),
        cycle: () => this.patch({ highContrast: !this.progress.settings.highContrast }),
      },
      {
        label: 'ON-SCREEN BUTTONS',
        hint: 'Touch pad on phones and tablets',
        value: () => (this.progress.settings.touchButtons ? 'ON' : 'OFF'),
        cycle: () => this.patch({ touchButtons: !this.progress.settings.touchButtons }),
      },
      {
        label: 'GESTURES',
        hint: 'Swipe to move, tap to rotate, two fingers to hold',
        value: () => (this.progress.settings.gestures ? 'ON' : 'OFF'),
        cycle: () => this.patch({ gestures: !this.progress.settings.gestures }),
      },
      {
        label: 'HORIZONTAL REPEAT (DAS)',
        hint: 'Delay before a held direction repeats',
        value: () => `${this.progress.settings.dasMs} ms`,
        cycle: (direction) => this.patch({ dasMs: clamp(this.progress.settings.dasMs + direction * 10, 60, 300) }),
      },
      {
        label: 'REPEAT SPEED (ARR)',
        hint: 'Time between repeated moves',
        value: () => `${this.progress.settings.arrMs} ms`,
        cycle: (direction) => this.patch({ arrMs: clamp(this.progress.settings.arrMs + direction * 10, 0, 100) }),
      },
      {
        label: 'REPLAY TUTORIAL',
        hint: 'Read the slide-window lesson again',
        value: () => 'OPEN',
        cycle: () => fadeTo(this, 'Help'),
      },
    ]

    this.rows = rows
    const startY = 108
    const rowHeight = 72
    rows.forEach((row, index) => {
      const y = startY + index * rowHeight
      const card = panel(this, 40, y, DESIGN_W - 80, 62, {
        fill: 0x0d1730,
        side: 0x05080f,
        raised: 3,
        radius: 16,
        strokeAlpha: 0.1,
        shadow: false,
      })
      this.content.add(card)
      this.content.add(label(this, 60, y + 12, row.label, 13, theme.ui.text, { fontStyle: 'bold' }))
      this.content.add(label(this, 60, y + 34, row.hint, 10, theme.ui.muted))
      const value = label(this, DESIGN_W - 150, y + 21, row.value(), 13, theme.ui.accent, {
        origin: [1, 0],
        fontStyle: 'bold',
      })
      this.content.add(value)
      this.valueTexts.push(value)

      const minus = this.add.text(DESIGN_W - 128, y + 31, '\u2212', {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '26px',
        color: theme.ui.text,
        backgroundColor: '#1a2748',
        padding: { left: 9, right: 9, top: 0, bottom: 3 },
      })
      minus.setOrigin(0.5).setInteractive({ useHandCursor: true })
      minus.on('pointerup', () => {
        sound.click()
        row.cycle(-1)
      })
      this.content.add(minus)

      const plus = this.add.text(DESIGN_W - 82, y + 31, '+', {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: '26px',
        color: theme.ui.text,
        backgroundColor: '#1a2748',
        padding: { left: 9, right: 9, top: 0, bottom: 3 },
      })
      plus.setOrigin(0.5).setInteractive({ useHandCursor: true })
      plus.on('pointerup', () => {
        sound.click()
        row.cycle(1)
      })
      this.content.add(plus)
    })
  }

  private addReset(root: Phaser.GameObjects.Container): void {
    const y = 108 + this.rows.length * 72 + 14
    let armed = false
    const reset = button(
      this,
      DESIGN_W / 2 - 170,
      y,
      340,
      48,
      'RESET ALL PROGRESS',
      () => {
        if (!armed) {
          armed = true
          reset.setAlpha(1)
          toast(this, 'Tap again to erase journey progress, stars and records.', themeById(this.progress.settings.themeId), { y: 130 })
          this.time.delayedCall(4000, () => {
            armed = false
          })
          return
        }
        this.progress = loadProgress()
        this.progress.journey = { unlocked: 1, stars: {}, bestMs: {} }
        this.progress.best = { marathon: 0, storm: 0, timeattack: 0, sprintMs: 0 }
        this.progress.achievements = []
        this.progress.stats = {
          games: 0,
          lines: 0,
          pieces: 0,
          fourLines: 0,
          tspins: 0,
          maxCombo: 0,
          playMs: 0,
          storms: 0,
          perfectClears: 0,
          journeyLevels: 0,
          stars: 0,
        }
        saveProgress(this.progress)
        toast(this, 'Progress reset. The first level is open again.', themeById(this.progress.settings.themeId), { y: 130 })
        this.scene.restart()
      },
      { fill: 0x3a1b2b, size: 13 },
    )
    root.add(reset)
    root.add(label(this, DESIGN_W / 2, y + 62, 'Settings are kept when progress is reset.', 9, '#93a0c6', { origin: 0.5 }))
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
