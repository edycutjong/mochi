/**
 * The TEACH picker.
 *
 * Centre-screen on desktop, because the mobile UI guidance places actionable
 * dialogs there. Inset on mobile, because on a real phone "centre-screen" put
 * this grid underneath the client's own F, E, jump and + buttons and a tap
 * meant for `tik` landed on jump.
 *
 * All of the geometry — where the client's controls are, where the panel is
 * allowed to sit, and whether the grid actually fits inside it — lives in
 * `picker-layout.ts`, which has no SDK import so the headless suite can assert
 * on it. `test/emote-picker.test.ts` is the ratchet. This file is just the
 * markup that spends those numbers.
 *
 * Twelve moves, chosen from the client's built-in set so nothing has to be
 * downloaded and every visitor has them. Labels are words rather than icons:
 * an icon grid needs a legend, and a legend is instruction text.
 */

// `ReactEcs` looks unused and is not. jsx is "react" with jsxFactory
// "ReactEcs.createElement" (@dcl/sdk/types/tsconfig.ecs7.json), so every tag
// below compiles to a call on it; deleting the import fails the build with
// TS2874. CodeQL does not read jsxFactory and flags it — dismissed as a false
// positive rather than "fixed".
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { PALETTE } from '../config'
import { GRID, panelInset } from './picker-layout'

/** Built-in emotes, so nothing depends on a wearable the visitor may not own. */
export const TEACHABLE = [
  { id: 'wave', label: 'wave' },
  { id: 'clap', label: 'clap' },
  { id: 'dance', label: 'dance' },
  { id: 'raiseHand', label: 'raise' },
  { id: 'fistpump', label: 'pump' },
  { id: 'robot', label: 'robot' },
  { id: 'kiss', label: 'kiss' },
  { id: 'shrug', label: 'shrug' },
  { id: 'dab', label: 'dab' },
  { id: 'disco', label: 'disco' },
  { id: 'headexplode', label: 'whoa' },
  { id: 'tik', label: 'tik' }
]

const TYPE = isMobile() ? { tile: 28, title: 32 } : { tile: 16, title: 19 }

const pct = (fraction: number) => `${fraction * 100}%` as const

function Tile(props: { label: string; onPick: () => void }) {
  return (
    <UiEntity
      uiTransform={{
        width: pct(GRID.tileWidth),
        height: pct(GRID.tileHeight),
        margin: pct(GRID.tileMargin),
        justifyContent: 'center',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.fromHexString('#FFFFFFf2') }}
      onMouseDown={props.onPick}
      uiText={{
        value: props.label,
        fontSize: TYPE.tile,
        color: Color4.fromHexString('#4A3B52ff')
      }}
    />
  )
}

export function EmotePicker(props: { onPick: (emoteId: string) => void; onDismiss: () => void }) {
  const inset = panelInset(isMobile())

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0, right: 0, bottom: 0 }
      }}
      // Tapping the scrim dismisses. No cancel button to hunt for, and no way
      // to get stuck in a dialog on a small screen. The scrim stays full-bleed
      // even though the panel does not: dismissing should work anywhere the
      // thumb lands, including over the client's own controls.
      uiBackground={{ color: Color4.create(0.23, 0.17, 0.27, 0.55) }}
      onMouseDown={props.onDismiss}
    >
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: {
            left: pct(inset.left),
            right: pct(inset.right),
            top: pct(inset.top),
            bottom: pct(inset.bottom)
          },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: pct(GRID.titleHeight),
            justifyContent: 'center',
            alignItems: 'center'
          }}
          uiText={{
            value: 'teach Mochi a move',
            fontSize: TYPE.title,
            color: Color4.White()
          }}
        />
        <UiEntity
          uiTransform={{
            width: '100%',
            height: pct(GRID.gridHeight),
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          uiBackground={{ color: PALETTE.bodyLight }}
        >
          {TEACHABLE.map((e) => (
            <Tile label={e.label} onPick={() => props.onPick(e.id)} />
          ))}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
