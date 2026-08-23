/**
 * The HUD — day-2 deliverable.
 *
 * Two buttons. Ever. PET is a hold on the creature's body and STAMP is a tap
 * on the totem, so neither needs screen furniture. The organizers' own words
 * govern this file: *"Instructions must be self-evident when entering the
 * game, as judges will experience it as a player rather than reading the code
 * or README."* There is therefore no tutorial, no onboarding modal, and no
 * instruction text anywhere in this UI.
 *
 * ## Placement, from Decentraland's mobile UI guidance
 *
 * - Actions go in the bottom thumb arc, sized large — *"don't rely on small
 *   buttons"*.
 * - Non-actionable status goes **top-centre**.
 * - Actionable dialogs (the TEACH picker, later) go **centre-screen**.
 *
 * ## Safe area
 *
 * `setUiRenderer` defaults `screenInset` to `'device'`, so the whole UI is
 * already constrained inside the notch, status bar and home indicator. The
 * `ScreenInsetArea` container is therefore NOT used here — it would apply the
 * same inset a second time and pull the thumb arc up off the bottom edge.
 */

// `ReactEcs` looks unused and is not. jsx is "react" with jsxFactory
// "ReactEcs.createElement" (@dcl/sdk/types/tsconfig.ecs7.json), so every tag
// below compiles to a call on it; deleting the import fails the build with
// TS2874. CodeQL does not read jsxFactory and flags it — dismissed as a false
// positive rather than "fixed".
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { PALETTE } from '../config'
import { EmotePicker } from './emote-picker'

export type HudActions = {
  onFeed: () => void
  onTeach: (emoteId: string) => void
}

let actions: HudActions = { onFeed: () => {}, onTeach: () => {} }

/** The TEACH picker is the only modal in the scene. */
let pickerOpen = false

/** Top-centre ambient line. Empty string hides it entirely. */
let bubble = ''
let bubbleRemaining = 0

/**
 * Shows an ambient message for a few seconds.
 *
 * Capped at roughly a dozen words by the design, not by this function — a
 * longer line wraps and starts to read as instruction, which is the one thing
 * this UI must not do.
 */
export function say(text: string, seconds = 4.5) {
  bubble = text
  bubbleRemaining = seconds
}

export function hudSystem(dt: number) {
  if (bubbleRemaining <= 0) return
  bubbleRemaining -= dt
  if (bubbleRemaining <= 0) bubble = ''
}

/**
 * Type scale.
 *
 * The mobile guidance is to author on desktop and multiply by 3. Whether that
 * multiplier compounds with the renderer's own virtual-scale factor is not
 * documented, so these two numbers are deliberately a single obvious knob to
 * turn while looking at a real phone — which is exactly what day 2 is for.
 */
const TYPE = isMobile() ? { button: 42, bubble: 30 } : { button: 22, bubble: 17 }

function ThumbButton(props: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <UiEntity
      uiTransform={{
        width: '46%',
        height: '100%',
        margin: '0 2% 0 2%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      uiBackground={{ color: props.accent ? PALETTE.accent : Color4.fromHexString('#FFFFFFe0') }}
      onMouseDown={props.onClick}
      uiText={{
        value: props.label,
        fontSize: TYPE.button,
        color: props.accent ? Color4.White() : Color4.fromHexString('#4A3B52ff')
      }}
    />
  )
}

const hud = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%', flexDirection: 'column' }}>
    {/* Top-centre: ambient status only. Never an instruction. */}
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '12%',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      {bubble !== '' && (
        <Label
          value={bubble}
          fontSize={TYPE.bubble}
          color={Color4.fromHexString('#4A3B52ff')}
          uiTransform={{ padding: 12 }}
          uiBackground={{ color: Color4.fromHexString('#FFFFFFe0') }}
        />
      )}
    </UiEntity>

    {/* Spacer — the creature owns the middle of the screen. */}
    <UiEntity uiTransform={{ width: '100%', height: '74%' }} />

    {/* Thumb arc. Two verbs, full width, bottom edge. */}
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '14%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <ThumbButton label="FEED" accent onClick={() => actions.onFeed()} />
      <ThumbButton label="TEACH" onClick={() => (pickerOpen = true)} />
    </UiEntity>

    {pickerOpen && (
      <EmotePicker
        onPick={(emoteId) => {
          pickerOpen = false
          actions.onTeach(emoteId)
        }}
        onDismiss={() => (pickerOpen = false)}
      />
    )}
  </UiEntity>
)

export function setupHud(a: HudActions) {
  actions = a
  // Virtual scale rather than raw pixels, per the mobile UI guidance. The
  // renderer keeps the UI inside the device safe area by default.
  ReactEcsRenderer.setUiRenderer(hud, { virtualWidth: 1280, virtualHeight: 720 })
}
