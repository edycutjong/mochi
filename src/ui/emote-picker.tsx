/**
 * The TEACH picker.
 *
 * Centre-screen, because the mobile UI guidance places actionable dialogs
 * there — anywhere the visitor has to read something and respond. Status goes
 * top, actions go bottom, decisions go centre.
 *
 * Twelve moves, chosen from the client's built-in set so nothing has to be
 * downloaded and every visitor has them. Labels are words rather than icons:
 * an icon grid needs a legend, and a legend is instruction text.
 */

import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { PALETTE } from '../config'

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

const TYPE = isMobile() ? { tile: 30, title: 34 } : { tile: 16, title: 19 }

function Tile(props: { label: string; onPick: () => void }) {
  return (
    <UiEntity
      uiTransform={{
        width: '30%',
        height: '20%',
        margin: '1.5%',
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
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0, right: 0, bottom: 0 },
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}
      // Tapping the scrim dismisses. No cancel button to hunt for, and no way
      // to get stuck in a dialog on a small screen.
      uiBackground={{ color: Color4.create(0.23, 0.17, 0.27, 0.55) }}
      onMouseDown={props.onDismiss}
    >
      <UiEntity
        uiTransform={{ width: '86%', height: '12%', justifyContent: 'center', alignItems: 'center' }}
        uiText={{
          value: 'teach Mochi a move',
          fontSize: TYPE.title,
          color: Color4.White()
        }}
      />
      <UiEntity
        uiTransform={{
          width: '86%',
          height: '62%',
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
  )
}
