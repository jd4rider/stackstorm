/*
 * Stackstorm's audio is synthesised at runtime with the Web Audio API. There are
 * no audio files to download and no licences to track. The AudioContext is only
 * created after the player's first gesture, so browser autoplay rules are kept.
 */

type MusicMode = 'menu' | 'marathon' | 'storm' | 'sprint' | 'timeattack' | 'puzzle' | 'results'

const MODES: Record<MusicMode, { step: number; notes: number[]; bass: number[]; bright: boolean }> = {
  menu: {
    step: 300,
    notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23],
    bass: [130.81, 146.83, 174.61, 196.0],
    bright: false,
  },
  marathon: {
    step: 250,
    notes: [329.63, 392.0, 523.25, 659.25, 523.25, 392.0, 440.0, 523.25],
    bass: [164.81, 196.0, 220.0, 196.0],
    bright: true,
  },
  storm: {
    step: 200,
    notes: [392.0, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 783.99],
    bass: [196.0, 233.08, 261.63, 233.08],
    bright: true,
  },
  sprint: {
    step: 180,
    notes: [440.0, 523.25, 659.25, 880.0, 659.25, 523.25, 587.33, 698.46],
    bass: [220.0, 261.63, 293.66, 261.63],
    bright: true,
  },
  timeattack: {
    step: 210,
    notes: [349.23, 440.0, 523.25, 698.46, 523.25, 440.0, 392.0, 466.16],
    bass: [174.61, 220.0, 233.08, 220.0],
    bright: true,
  },
  puzzle: {
    step: 360,
    notes: [261.63, 293.66, 349.23, 392.0, 440.0, 392.0, 349.23, 293.66],
    bass: [130.81, 146.83, 174.61, 164.81],
    bright: false,
  },
  results: {
    step: 320,
    notes: [392.0, 523.25, 659.25, 783.99, 659.25, 523.25, 440.0, 523.25],
    bass: [196.0, 220.0, 261.63, 220.0],
    bright: false,
  },
}

export class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private musicTimer: number | null = null
  private musicStep = 0
  private mode: MusicMode = 'menu'
  private masterVolume = 0.8
  private musicVolume = 0.45
  private sfxVolume = 0.8
  private muted = false
  private musicWanted = true
  private ducked = false

  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume()
      return
    }
    const Ctor = typeof window !== 'undefined' ? window.AudioContext : undefined
    if (!Ctor) return
    this.context = new Ctor()
    this.master = this.context.createGain()
    this.master.connect(this.context.destination)
    this.sfxBus = this.context.createGain()
    this.sfxBus.connect(this.master)
    this.musicBus = this.context.createGain()
    this.musicBus.connect(this.master)
    this.applyVolumes()
    if (this.musicWanted) this.startMusic()
  }

  setVolumes(master: number, music: number, sfx: number, muted: boolean): void {
    this.masterVolume = master
    this.musicVolume = music
    this.sfxVolume = sfx
    this.muted = muted
    this.applyVolumes()
  }

  private applyVolumes(): void {
    if (!this.context || !this.master || !this.musicBus || !this.sfxBus) return
    const now = this.context.currentTime
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.02)
    this.musicBus.gain.setTargetAtTime((this.ducked ? 0.25 : 1) * this.musicVolume, now, 0.04)
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, now, 0.02)
  }

  setMusicWanted(wanted: boolean): void {
    this.musicWanted = wanted
    if (wanted) this.startMusic()
    else this.stopMusic()
  }

  setMusicMode(mode: MusicMode): void {
    this.mode = mode
    this.musicStep = 0
  }

  duck(active: boolean): void {
    this.ducked = active
    this.applyVolumes()
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
    slideTo?: number,
  ): void {
    if (!this.context || !this.sfxBus) return
    const start = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(this.sfxBus)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  private noise(duration: number, gain: number, delay = 0, highpass = 500): void {
    if (!this.context || !this.sfxBus) return
    const frames = Math.max(1, Math.floor(this.context.sampleRate * duration))
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frames; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frames)
    }
    const source = this.context.createBufferSource()
    source.buffer = buffer
    const filter = this.context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = highpass
    const envelope = this.context.createGain()
    envelope.gain.value = gain
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(this.sfxBus)
    source.start(this.context.currentTime + delay)
  }

  click(): void {
    this.tone(560, 0.055, 'sine', 0.13)
  }

  /** A brighter, two-note confirmation used for navigation and equip actions. */
  select(): void {
    this.tone(660, 0.06, 'sine', 0.12)
    this.tone(990, 0.09, 'triangle', 0.08, 0.045)
  }

  move(): void {
    this.tone(220, 0.035, 'triangle', 0.05)
  }

  rotate(): void {
    this.tone(420, 0.05, 'sine', 0.09)
    this.tone(640, 0.05, 'sine', 0.05, 0.03)
  }

  softDrop(): void {
    this.tone(180, 0.025, 'triangle', 0.03)
  }

  hold(): void {
    this.tone(300, 0.09, 'triangle', 0.12)
    this.tone(450, 0.12, 'sine', 0.09, 0.06)
  }

  lock(): void {
    this.tone(150, 0.06, 'square', 0.05, 0, 110)
    this.noise(0.04, 0.025, 0, 900)
  }

  hardDrop(): void {
    this.noise(0.09, 0.09, 0, 320)
    this.tone(90, 0.12, 'sine', 0.2, 0, 45)
    this.tone(240, 0.06, 'triangle', 0.08, 0.01)
  }

  clear(lines: number): void {
    const root = [0, 523.25, 587.33, 659.25, 783.99][Math.min(4, lines)] ?? 523.25
    for (let index = 0; index < Math.min(5, lines + 2); index += 1) {
      this.tone(root * Math.pow(1.26, index), 0.2, 'triangle', 0.13, index * 0.045)
    }
    this.noise(0.12, 0.04 + lines * 0.012, 0, 1200)
  }

  stormBreak(): void {
    this.noise(0.5, 0.14, 0, 180)
    this.tone(60, 0.55, 'sine', 0.28, 0, 32)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((frequency, index) => this.tone(frequency, 0.42, 'triangle', 0.16, index * 0.06))
    this.tone(196, 0.8, 'sawtooth', 0.07, 0.1, 98)
  }

  combo(level: number): void {
    const base = 440 * Math.pow(1.06, Math.min(12, level))
    this.tone(base, 0.1, 'sine', 0.12)
    this.tone(base * 1.5, 0.12, 'triangle', 0.08, 0.05)
  }

  levelUp(): void {
    this.tone(523.25, 0.16, 'triangle', 0.14)
    this.tone(659.25, 0.16, 'triangle', 0.12, 0.1)
    this.tone(783.99, 0.22, 'triangle', 0.12, 0.2)
  }

  storm(): void {
    this.noise(0.4, 0.12, 0, 400)
    this.tone(130.81, 0.5, 'sawtooth', 0.1, 0, 392)
    this.tone(392, 0.4, 'triangle', 0.12, 0.08)
  }

  achievement(): void {
    const notes = [659.25, 783.99, 987.77, 1318.5]
    notes.forEach((frequency, index) => this.tone(frequency, 0.3, 'sine', 0.13, index * 0.08))
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((frequency, index) => this.tone(frequency, 0.4, 'triangle', 0.15, index * 0.1))
    this.noise(0.3, 0.04, 0.1, 1500)
  }

  lose(): void {
    this.tone(392, 0.35, 'triangle', 0.12, 0, 261)
    this.tone(261, 0.5, 'sine', 0.12, 0.18, 174)
  }

  pause(): void {
    this.tone(440, 0.08, 'sine', 0.1)
    this.tone(330, 0.12, 'sine', 0.08, 0.07)
  }

  error(): void {
    this.tone(180, 0.12, 'square', 0.07, 0, 120)
  }

  private startMusic(): void {
    if (!this.musicWanted || !this.context || this.musicTimer !== null) return
    const config = MODES[this.mode]
    this.musicTimer = window.setInterval(() => this.musicTick(), config.step)
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private musicTick(): void {
    if (!this.context || !this.musicBus || !this.musicWanted || this.muted) return
    const config = MODES[this.mode]
    const context = this.context
    const start = context.currentTime
    const note = config.notes[this.musicStep % config.notes.length]!
    const bass = config.bass[Math.floor(this.musicStep / 4) % config.bass.length]!

    const voice = context.createOscillator()
    const gain = context.createGain()
    voice.type = config.bright ? 'triangle' : 'sine'
    voice.frequency.value = note
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.035, start + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + config.step / 1000)
    voice.connect(gain)
    gain.connect(this.musicBus)
    voice.start(start)
    voice.stop(start + config.step / 1000 + 0.03)

    const bassVoice = context.createOscillator()
    const bassGain = context.createGain()
    bassVoice.type = 'sine'
    bassVoice.frequency.value = bass
    bassGain.gain.setValueAtTime(0.0001, start)
    bassGain.gain.exponentialRampToValueAtTime(0.03, start + 0.05)
    bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9)
    bassVoice.connect(bassGain)
    bassGain.connect(this.musicBus)
    bassVoice.start(start)
    bassVoice.stop(start + 0.95)

    if (config.bright && this.musicStep % 4 === 2) {
      const hat = context.createOscillator()
      const hatGain = context.createGain()
      hat.type = 'square'
      hat.frequency.value = 2400
      hatGain.gain.setValueAtTime(0.0001, start)
      hatGain.gain.exponentialRampToValueAtTime(0.012, start + 0.005)
      hatGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045)
      hat.connect(hatGain)
      hatGain.connect(this.musicBus)
      hat.start(start)
      hat.stop(start + 0.06)
    }

    this.musicStep += 1
    if (this.musicStep % 64 === 0) {
      // Keep the sequencer flavour evolving without changing the volume.
      this.musicStep = 0
    }
  }
}

export const sound = new SoundEngine()
