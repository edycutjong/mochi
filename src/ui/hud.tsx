/**
 * The HUD — what is left of it.
 *
 * Two things only: a top-centre ambient line, and the TEACH picker. Every verb
 * in the scene is a tap in the world — PET on the creature's body, STAMP on the
 * totem, FEED on the bowl, TEACH on the stage — so no verb needs screen
 * furniture. The organizers' own words govern this file: *"Instructions must be
 * self-evident when entering the game, as judges will experience it as a player
 * rather than reading the code or README."* There is therefore no tutorial, no
 * onboarding modal, and no instruction text anywhere in this UI.
 *
 * ## Why the bottom of the screen is empty
 *
 * FEED and TEACH were buttons in a bottom thumb arc, which is where
 * Decentraland's mobile UI guidance puts actions. On a real phone that arc sat
 * on top of the client's own controls: it covered the movement joystick and the
 * emote buttons either side of it, and a tap meant for jump landed on TEACH —
 * which appends a permanent row to a chain that has no delete verb.
 *
 * Decentraland warns that scene UI "will clash with the system controls" but
 * does not publish where those controls are, and two attempts to dodge them by
 * guessing at percentages both failed on the device. Percentages were the wrong
 * tool: the only fix that cannot be wrong is to own none of that strip. So the
 * buttons were deleted rather than moved, and the two verbs became props in the
 * meadow — see `mochi/meadow.ts`, which also carries how a first-time visitor
 * is expected to recognise them.
 *
 * ## Placement, from Decentraland's mobile UI guidance
 *
 * - Non-actionable status goes **top-centre**. That is the bubble.
 * - Actionable dialogs go **centre-screen**. That is the picker, and it is the
 *   one piece of screen-space UI the scene still owns.
 *
 * ## Safe area
 *
 * `setUiRenderer` defaults `screenInset` to `'device'`, so the whole UI is
 * already constrained inside the notch and the status bar. The
 * `ScreenInsetArea` container is therefore NOT used here — it would apply the
 * same inset a second time.
 */

// `ReactEcs` looks unused and is not. jsx is "react" with jsxFactory
// "ReactEcs.createElement" (@dcl/sdk/types/tsconfig.ecs7.json), so every tag
// below compiles to a call on it; deleting the import fails the build with
// TS2874. CodeQL does not read jsxFactory and flags it — dismissed as a false
// positive rather than "fixed".
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import { EmotePicker } from './emote-picker'

export type HudActions = {
  onTeach: (emoteId: string) => void
}

let actions: HudActions = { onTeach: () => {} }

/** The TEACH picker is the only modal in the scene. */
let pickerOpen = false

/**
 * Opens the picker.
 *
 * Called from the world, by a tap on the stage. Nothing on screen opens it,
 * which is the point — the dialog is screen-space because a grid of choices has
 * to be, but the decision to summon it is made by walking up to a thing.
 */
export function openPicker() {
  pickerOpen = true
}

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
 * documented, so this is deliberately a single obvious knob to turn while
 * looking at a real phone.
 */
const TYPE = isMobile() ? { bubble: 30 } : { bubble: 17 }

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

    {/*
      Nothing else. The rest of the screen belongs to the creature and to the
      client's own controls, and this scene deliberately places nothing over
      either of them.
    */}

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
