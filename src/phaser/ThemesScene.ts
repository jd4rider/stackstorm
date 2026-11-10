import Phaser from 'phaser'
import { THEMES, isThemeUnlocked, themeById } from '../config/themes'
import { sound } from '../core/audio'
import { loadProgress, totalStars, updateSettings } from '../core/saves'
import { backdrop, fadeIn, fadeTo, header, label, starRow, stage, toast, DESIGN_W, DESIGN_H, panel } from './common'
import { buildTextures, blockKey } from './textures'

export class ThemesScene extends Phaser.Scene {
  constructor() {
    super('Themes')
  }

  create(): void {
    const progress = loadProgress()
    const active = themeById(progress.settings.themeId)
    const stars = totalStars(progress)
    backdrop(this, active)
    // The boot pass only builds the equipped theme, so prepare the swatches as
    // this screen opens rather than making every player wait for all of them.
    buildTextures(this, THEMES)
    const root = stage(this)
    header(this, root, 'THEMES', () => fadeTo(this, 'Menu'), active, `\u2605 ${stars}`)
    root.add(
      label(this, DESIGN_W / 2, 78, 'EARN STARS IN THE JOURNEY TO OPEN EVERY PALETTE', 10, active.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.4,
      }),
    )

    THEMES.forEach((theme, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 30 + column * 340
      const y = 108 + row * 236
      const unlocked = isThemeUnlocked(theme, stars)
      const selected = theme.id === progress.settings.themeId
      const accent = Phaser.Display.Color.HexStringToColor(theme.ui.accent).color

      const card = panel(this, x, y, 320, 216, {
        fill: Phaser.Display.Color.HexStringToColor(theme.ui.panel).color,
        side: 0x05080f,
        raised: 4,
        radius: 20,
        stroke: selected ? accent : 0xffffff,
        strokeAlpha: selected ? 0.8 : 0.1,
      })
      root.add(card)

      const preview = this.add.graphics()
      preview.fillStyle(Phaser.Display.Color.HexStringToColor(theme.ui.bgTop).color, 1)
      preview.fillRoundedRect(x + 14, y + 14, 292, 92, 14)
      preview.fillGradientStyle(
        Phaser.Display.Color.HexStringToColor(theme.ui.bgTop).color,
        Phaser.Display.Color.HexStringToColor(theme.ui.bgTop).color,
        Phaser.Display.Color.HexStringToColor(theme.ui.bgBottom).color,
        Phaser.Display.Color.HexStringToColor(theme.ui.bgBottom).color,
        1,
      )
      preview.fillRoundedRect(x + 14, y + 14, 292, 92, 14)
      root.add(preview)

      for (let block = 0; block < 4; block += 1) {
        const key = blockKey(theme.id, [1, 3, 2, 4][block]!)
        if (!this.textures.exists(key)) continue
        const image = this.add.image(x + 62 + block * 68, y + 60, key).setDisplaySize(46, 46)
        root.add(image)
      }

      root.add(
        label(this, x + 18, y + 120, theme.name.toUpperCase(), 16, theme.ui.text, {
          fontStyle: 'bold',
          letterSpacing: 0.6,
        }),
      )
      root.add(label(this, x + 18, y + 146, theme.description, 10, theme.ui.muted, { wrap: 276, lineSpacing: 2 }))

      if (unlocked) {
        root.add(
          starRow(this, x + 24, y + 184, selected ? 1 : 0, 10, 1),
        )
        root.add(
          label(this, x + 42, y + 178, selected ? 'EQUIPPED' : 'TAP TO EQUIP', 9, selected ? theme.ui.accent : theme.ui.muted, {
            fontStyle: 'bold',
            letterSpacing: 1,
          }),
        )
      } else {
        root.add(label(this, x + 18, y + 178, `\u{1F512}  ${theme.starsRequired} STARS`, 10, theme.ui.muted, { fontStyle: 'bold' }))
      }

      if (unlocked) {
        const hit = this.add.rectangle(x + 160, y + 108, 320, 216, 0xffffff, 0)
        hit.setInteractive({ useHandCursor: true })
        hit.on('pointerup', () => {
          sound.select()
          updateSettings(progress, { themeId: theme.id })
          toast(this, `${theme.name} equipped.`, theme)
          this.scene.restart()
        })
        root.add(hit)
      } else {
        card.setAlpha(0.82)
      }
    })

    root.add(
      label(this, DESIGN_W / 2, DESIGN_H - 38, 'THEMES CHANGE COLOUR ONLY — NEVER THE RULES.', 9, active.ui.muted, {
        origin: 0.5,
        letterSpacing: 1.2,
      }),
    )

    fadeIn(this)
  }
}
