import Phaser from 'phaser'
import { THEMES } from '../config/themes'
import { display, label, stage } from './common'
import { buildTextures } from './textures'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#080b1a')
    const root = stage(this)
    const width = 720

    const block = this.add.graphics()
    block.fillStyle(0x67f6ff, 1)
    block.fillRoundedRect(-76, -76, 64, 64, 14)
    block.fillStyle(0xa855f7, 1)
    block.fillRoundedRect(12, -76, 64, 64, 14)
    block.fillStyle(0xffd23f, 1)
    block.fillRoundedRect(-76, 12, 64, 64, 14)
    block.fillStyle(0xff4d6d, 1)
    block.fillRoundedRect(12, 12, 64, 64, 14)
    block.setPosition(width / 2, 390)
    root.add(block)

    root.add(display(this, width / 2, 530, 'STACKSTORM', 78, '#ffffff', 0.5))
    root.add(
      label(this, width / 2, 585, 'STACK · SLIDE · STORM', 13, '#67f6ff', {
        origin: 0.5,
        letterSpacing: 4,
        fontStyle: 'bold',
      }),
    )

    const barWidth = 440
    const barX = (width - barWidth) / 2
    const barY = 690
    const frame = this.add.graphics()
    frame.fillStyle(0xffffff, 0.1)
    frame.fillRoundedRect(barX, barY, barWidth, 12, 6)
    root.add(frame)
    const fill = this.add.graphics()
    fill.fillStyle(0x67f6ff, 1)
    fill.fillRoundedRect(barX, barY, barWidth, 12, 6)
    fill.fillStyle(0xffffff, 0.3)
    fill.fillRoundedRect(barX + 2, barY + 2, barWidth - 4, 4, 2)
    root.add(fill)

    root.add(
      label(this, width / 2, barY + 34, 'LOADING THE STORM', 11, '#93a0c6', {
        origin: 0.5,
        letterSpacing: 2,
      }),
    )

    // One synchronous pass: every theme is ready before the menu appears, so a
    // slow frame can never leave the game stuck on a partially built boot screen.
    buildTextures(this, THEMES)
    this.time.delayedCall(260, () => this.scene.start('Menu'))
  }
}
