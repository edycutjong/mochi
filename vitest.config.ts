import { defineConfig } from 'vitest/config'

/**
 * Headless tests for the scene.
 *
 * The server's suite is the one with the coverage ratchet; this one exists for
 * a narrower reason. `@dcl/ecs` — the engine underneath `@dcl/sdk/ecs` — is
 * ordinary TypeScript with no renderer attached, so entities, components and
 * systems can be driven outside the Decentraland client even though nothing
 * can be *drawn* there. That is enough to answer two questions that used to be
 * answerable only on a phone: how many entities the scene actually builds, and
 * whether a state broadcast tears the ring of dancers down and rebuilds it.
 *
 * What it cannot do is render, so nothing here asserts about anything visual.
 * The scene's visual behaviour is still verified on a device, and the parts of
 * `src/` that reach for the client runtime (`~system/*`, the react-ecs HUD)
 * cannot be imported at all.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],

    // `engine` is a module-level singleton. Vitest isolates each test file in
    // its own module registry, which is what keeps one file's entities out of
    // another file's counts — so the default isolation is load-bearing here
    // rather than incidental.
    isolate: true
  }
})
