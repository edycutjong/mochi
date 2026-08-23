---
name: Feature request
about: Suggest an idea for Mochi
title: ''
labels: enhancement
assignees: ''
---

## The problem

<!--
What is missing or awkward today? Describe the situation, not the solution.
"When I arrive alone at 2am, I can't tell ..." is more useful than
"add a leaderboard".
-->

## What you would like to happen

<!-- Your proposal, as concretely as you can put it. -->

## Which half would it live in

- [ ] The scene (`src/`) — something you see or touch
- [ ] The server (`server/`) — a new rule, message, or piece of state
- [ ] Both

## How it fits Mochi

Mochi has some deliberate constraints. If your idea touches one of these,
please say how it works around it:

- **Zero typing, and no on-screen buttons.** Every verb is a tap on an object
  in the meadow, because the bottom of the screen belongs to the Decentraland
  client's own controls. The client also only gives us press and release — no
  drag, no text entry.
- **Nothing is ever punished, lost, or reset.** There is no fail state and no
  delete verb anywhere in the server.
- **Every act is attributed to a named person.** An anonymous version of a
  feature usually turns it into a leaderboard, which is not what this is.
- **The scene owns no state.** It sends intents and renders what the server
  says.
- **A tight mobile budget.** The creature is a sub-2k-triangle sphere animated
  by Tween, with no rig and no dynamic lights.

## Alternatives you have considered

<!-- Optional. -->

## Anything else

<!-- Sketches, references, links. -->
