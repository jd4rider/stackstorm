import Phaser from 'phaser'
import './style.css'
import { sound } from './core/audio'
import { AchievementsScene } from './phaser/AchievementsScene'
import { BootScene } from './phaser/BootScene'
import { GameScene } from './phaser/GameScene'
import { HelpScene } from './phaser/HelpScene'
import { JourneyScene } from './phaser/JourneyScene'
import { MenuScene } from './phaser/MenuScene'
import { ResultsScene } from './phaser/ResultsScene'
import { SettingsScene } from './phaser/SettingsScene'
import { StatsScene } from './phaser/StatsScene'
import { ThemesScene } from './phaser/ThemesScene'

declare global {
  interface Window {
    __STACKSTORM__?: Phaser.Game
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#080b1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: typeof window === 'undefined' ? 720 : window.innerWidth,
    height: typeof window === 'undefined' ? 1280 : window.innerHeight,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  input: {
    activePointers: 4,
  },
  // Do not average/shorten frame deltas: a smoothed delta makes gravity and
  // lock delay run in slow motion on a slow device. The engine sub-steps the
  // raw frame time itself and caps long stalls.
  fps: { target: 60, forceSetTimeOut: false, smoothStep: false },
  scene: [
    BootScene,
    MenuScene,
    JourneyScene,
    GameScene,
    ResultsScene,
    SettingsScene,
    ThemesScene,
    AchievementsScene,
    StatsScene,
    HelpScene,
  ],
}

export const game = new Phaser.Game(config)
window.__STACKSTORM__ = game

// Browsers require a gesture before audio may start; unlock once, quietly.
document.addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true })
document.addEventListener('keydown', () => sound.unlock(), { once: true, capture: true })

// Stop iOS Safari from rubber-banding the page while playing.
document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) return
    const target = event.target as HTMLElement | null
    if (target && target.tagName === 'CANVAS') event.preventDefault()
  },
  { passive: false },
)
