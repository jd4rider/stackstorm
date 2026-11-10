import Phaser from 'phaser'
import { THEMES } from '../config/themes'
import { display, label, FONT } from './common'
import { buildTextures } from './textures'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height
    this.cameras.main.setBackgroundColor('#080b1a')

    const root = this.add.container(0, 0)
    const block = this.add.graphics()
    block.fillStyle(0x67f6ff, 1)
    block.fillRoundedRect(-66, -66, 56, 56, 12)
    block.fillStyle(0xa855f7, 1)
    block.fillRoundedRect(10, -66, 56, 56, 12)
    block.fillStyle(0xffd23f, 1)
    block.fillRoundedRect(-66, 10, 56, 56, 12)
    block.fillStyle(0xff4d6d, 1)
    block.fillRoundedRect(10, 10, 56, 56, 12)
    block.setPosition(width / 2, height / 2 - 110)
    root.add(block)

    root.add(
      display(this, width / 2, height / 2 + 10, 'STACKSTORM', Math.min(64, width * 0.11), '#ffffff', 0.5),
    )
    root.add(
      label(this, width / 2, height / 2 + 62, 'MAKE EVERY LINE CLEAR FEEL INCREDIBLE', 11, '#67f6ff', {
        origin: 0.5,
        fontFamily: FONT,
        letterSpacing: 2.4,
        fontStyle: 'bold',
      }),
    )

    const barWidth = Math.min(420, width * 0.7)
    const barX = (width - barWidth) / 2
    const barY = height / 2 + 150
    const frame = this.add.graphics()
    frame.fillStyle(0xffffff, 0.08)
    frame.fillRoundedRect(barX, barY, barWidth, 10, 5)
    root.add(frame)
    const fill = this.add.graphics()
    root.add(fill)
    const status = label(this, width / 2, barY + 28, 'BUILDING THE STORM', 11, '#93a0c6', {
      origin: 0.5,
      letterSpacing: 1.8,
    })
    root.add(status)

    let index = 0
    const step = (): void => {
      if (index >= THEMES.length) {
        status.setText('READY')
        this.time.delayedCall(220, () => this.scene.start('Menu'))
        return
      }
      const theme = THEMES[index]!
      buildTextures(this, [theme])
      index += 1
      const ratio = index / THEMES.length
      fill.clear()
      fill.fillStyle(0x67f6ff, 1)
      fill.fillRoundedRect(barX, barY, Math.max(10, barWidth * ratio), 10, 5)
      fill.fillStyle(0xffffff, 0.25)
      fill.fillRoundedRect(barX + 2, barY + 2, Math.max(6, barWidth * ratio - 4), 3, 2)
      this.time.delayedCall(24, step)
    }
    this.time.delayedCall(80, step)
  }
}
