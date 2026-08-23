/**
 * Day-1 capability probe — on-screen readout.
 *
 * Deliberately readable on a phone with nothing attached: large type, high
 * contrast, one line per check. The point is that a person holding the device
 * can read five answers off the screen and write them down, without a laptop,
 * a console, or a second person.
 *
 * Emote counters update live, so performing an emote from the mobile emote
 * wheel and watching the number move IS the test.
 */

// `ReactEcs` looks unused and is not. jsx is "react" with jsxFactory
// "ReactEcs.createElement" (@dcl/sdk/types/tsconfig.ecs7.json), so every tag
// below compiles to a call on it; deleting the import fails the build with
// TS2874. CodeQL does not read jsxFactory and flags it — dismissed as a false
// positive rather than "fixed".
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { probe, shortUrn } from './state'

const PASS = '#7ddc8aff'
// No FAIL colour: none of the six checks has a failing state that stops the
// probe. "DATA YES / onChange NO" is amber rather than red because it is a
// working route — polling instead of callbacks — not a dead end.
const WAIT = '#ffd88aff'
const INFO = '#dfe8f0ff'

function row(text: string, color: string) {
  return (
    <Label
      value={text}
      fontSize={16}
      color={Color4.fromHexString(color)}
      uiTransform={{ width: '100%', height: 24 }}
    />
  )
}

/** Check 2 is the decisive one, so it gets its own verdict line. */
function emoteVerdict(): { text: string; color: string } {
  const { pollCount, onChangeCount } = probe

  if (pollCount === 0 && onChangeCount === 0) {
    return { text: '2. EMOTE  … perform an emote now', color: WAIT }
  }
  if (pollCount > 0 && onChangeCount === 0) {
    return { text: `2. EMOTE  DATA YES / onChange NO (${pollCount})`, color: WAIT }
  }
  return { text: `2. EMOTE  PASS  poll ${pollCount} / onChange ${onChangeCount}`, color: PASS }
}

const hud = () => {
  const verdict = emoteVerdict()
  const guest = probe.playerIsGuest === null ? '?' : probe.playerIsGuest ? 'GUEST' : 'wallet'

  return (
    <UiEntity
      uiTransform={{
        width: '96%',
        height: 'auto',
        margin: '8px 0 0 2%',
        padding: 10,
        flexDirection: 'column'
      }}
      uiBackground={{ color: Color4.create(0.05, 0.07, 0.09, 0.82) }}
    >
      {row(`MOCHI PROBE — ${probe.platform.toUpperCase()}  ${probe.fps}fps`, INFO)}
      {row(`${probe.screen}  ·  ${probe.playerName} (${guest})`, INFO)}
      {row('', INFO)}
      {row('1. AVATAR   look LEFT — avatar by blue post?', INFO)}
      {row(verdict.text, verdict.color)}
      {row(`   last: ${shortUrn(probe.lastEmoteUrn)} · ${probe.lastEmoteState}`, INFO)}
      {row('3. PARTICLE look RIGHT — sparks by pink post?', INFO)}
      {row('4. TEXT     is text level with cube top?', INFO)}
      {row('5. REEL     is there a photo button in the HUD?', INFO)}
    </UiEntity>
  )
}

export function setupProbeHud() {
  ReactEcsRenderer.setUiRenderer(hud)
}
