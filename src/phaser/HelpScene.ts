import Phaser from 'phaser'
import { themeById } from '../config/themes'
import { loadProgress, updateSettings } from '../core/saves'
import { backdrop, button, fadeIn, fadeTo, header, label, panel, stage, starRow, DESIGN_W, DESIGN_H } from './common'
import { blockKey } from './textures'

export class HelpScene extends Phaser.Scene {
  constructor() {
    super('Help')
  }

  create(): void {
    const progress = loadProgress()
    const theme = themeById(progress.settings.themeId)
    backdrop(this, theme)
    const root = stage(this)
    header(this, root, 'HOW TO PLAY', () => fadeTo(this, 'Menu'), theme)

    const card = panel(this, 30, 84, DESIGN_W - 60, 890, {
      fill: 0x0b1428,
      side: 0x05080f,
      raised: 4,
      radius: 24,
      stroke: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
      strokeAlpha: 0.2,
    })
    root.add(card)

    root.add(label(this, 58, 108, 'THE IDEA', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    root.add(
      label(
        this,
        58,
        130,
        'Fit every tetramino into the stack. Complete a row and it clears. Do it again and again for combos, back-to-back bonuses and storm charges.',
        12,
        theme.ui.text,
        { wrap: DESIGN_W - 116, lineSpacing: 4 },
      ),
    )

    root.add(label(this, 58, 200, 'THE SLIDE WINDOW', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    root.add(
      label(
        this,
        58,
        222,
        'When a piece touches the stack it does not lock instantly. You have half a second to slide or turn it into place. Every successful nudge restarts that half second, up to fifteen times. Watch the glowing outline and the thin bar at the top of the board — that is your moment.',
        12,
        theme.ui.text,
        { wrap: DESIGN_W - 116, lineSpacing: 4 },
      ),
    )

    // A little illustrated strip: landed piece, slide highlight, lock.
    const stripY = 306
    const strip = this.add.graphics()
    strip.fillStyle(0x05080f, 0.5)
    strip.fillRoundedRect(52, stripY, DESIGN_W - 104, 74, 12)
    root.add(strip)
    const demo = [
      { key: blockKey(theme.id, 3), x: 92, alpha: 1 },
      { key: blockKey(theme.id, 3), x: 156, alpha: 1 },
      { key: blockKey(theme.id, 3), x: 220, alpha: 1 },
      { key: blockKey(theme.id, 3), x: 284, alpha: 0.2 },
    ]
    demo.forEach((entry) => {
      if (!this.textures.exists(entry.key)) return
      root.add(this.add.image(entry.x, stripY + 37, entry.key).setDisplaySize(48, 48).setAlpha(entry.alpha))
    })
    root.add(label(this, 330, stripY + 22, 'LAND', 9, theme.ui.muted, { fontStyle: 'bold' }))
    root.add(label(this, 330, stripY + 42, 'SLIDE WITH ← → OR SWIPE', 9, theme.ui.text))
    const arrow = label(this, DESIGN_W - 72, stripY + 37, '\u2192', 26, theme.ui.accent, { origin: 0.5 })
    root.add(arrow)
    this.tweens.add({ targets: arrow, x: arrow.x + 10, duration: 700, yoyo: true, repeat: -1 })

    root.add(label(this, 58, 406, 'CONTROLS', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    const controls = [
      ['← →', 'Move · hold to repeat'],
      ['↓', 'Soft drop'],
      ['SPACE', 'Hard drop'],
      ['↑ / X', 'Rotate'],
      ['C / SHIFT', 'Hold a piece'],
      ['ESC / P', 'Pause'],
      ['S', 'Activate Storm Surge'],
      ['TAP', 'Rotate the piece'],
    ]
    controls.forEach(([key, meaning], index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 58 + column * 306
      const y = 432 + row * 34
      const pill = this.add.graphics()
      pill.fillStyle(0x1a2748, 1)
      pill.fillRoundedRect(x, y, 86, 24, 7)
      root.add(pill)
      root.add(label(this, x + 43, y + 12, key, 10, theme.ui.text, { origin: 0.5, fontStyle: 'bold' }))
      root.add(label(this, x + 98, y + 11, meaning, 10, theme.ui.muted))
    })

    root.add(label(this, 58, 588, 'SCORING', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    root.add(
      label(
        this,
        58,
        610,
        'Singles 100 · Doubles 300 · Triples 500 · Four lines 800, all × your level. Consecutive clears build a combo. Back-to-back four-line clears and T-spins add 50%. A completely empty board pays a perfect-clear bonus.',
        12,
        theme.ui.text,
        { wrap: DESIGN_W - 116, lineSpacing: 4 },
      ),
    )

    root.add(label(this, 58, 690, 'THE JOURNEY', 12, theme.ui.accent, { fontStyle: 'bold', letterSpacing: 1.6 }))
    root.add(
      label(
        this,
        58,
        712,
        'Ten worlds, fifty levels each. Each level gives you a fixed piece sequence and a board with empty wells. Use the I pieces to fill the wells, spend the decoys without blocking yourself, and clear the line target. Stars reward speed. Every level ships with a proven solution.',
        12,
        theme.ui.text,
        { wrap: DESIGN_W - 116, lineSpacing: 4 },
      ),
    )

    root.add(starRow(this, 92, 846, 3, 24, 3))
    root.add(label(this, 132, 836, '1 star: clear · 2: under par · 3: under gold time', 10, theme.ui.muted))

    const start = button(
      this,
      DESIGN_W / 2 - 150,
      866,
      300,
      52,
      'START PLAYING',
      () => {
        updateSettings(progress, { tutorialSeen: true })
        fadeTo(this, 'Menu')
      },
      {
        fill: Phaser.Display.Color.HexStringToColor(theme.ui.accent).color,
        textColor: '#061018',
        size: 17,
        glow: true,
      },
    )
    root.add(start)

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 38, 'NO ACCOUNT NEEDED · PLAYS OFFLINE · PROGRESS SAVES LOCALLY', 9, theme.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.2,
      }),
    )
    fadeIn(this)
  }
}
