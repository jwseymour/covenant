# Shattered Covenant

[![CI](https://github.com/jwseymour/covenant/actions/workflows/ci.yml/badge.svg)](https://github.com/jwseymour/covenant/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Tests](https://img.shields.io/badge/tests-236%20passing-brightgreen)

A multiplayer, digital-only **dark fantasy board game** about hopping between drifting realms, controlling rulers, founding deceptive religions, and harvesting souls. Built end to end: game design, a deterministic rules engine, an authoritative WebSocket server, and a React/Three.js client.

You play one of the **Ordained**, a sacred being freed when the Covenant that bound reality shattered into five realms. Four players compete for souls, secret missions, or an instant win through the *Rite of the New Covenant*, while the realms drift toward a final Convergence.

## Highlights

- **Programmable orchestration.** Players can't be everywhere, so they leave conditional instructions for their dominions and religions. A visual flowchart builder compiles these into rules that an instruction executor runs each turn.
- **Hidden information.** The server is authoritative and filters game state per player (`state-filter`), so rivals' religions, missions and plans stay secret.
- **Simultaneous turn resolution.** All players submit actions at once, and a deterministic turn resolver applies them in a fixed order.
- **Procedural world.** A graph generator builds realm maps with access points. Realms drift, flow and merge over time.
- **Many interlocking systems.** Dominions with influence decay, religions with belief tags and schisms, rituals, relics, rite sites, combat cards, direct confrontation and missions. Optional systems can be toggled to scale complexity.
- **Tested rules engine.** 236 unit tests cover the game logic.

## Architecture

A TypeScript npm-workspaces monorepo:

| Package | Role |
| --- | --- |
| [`shared/`](shared/) | Pure, framework-free game logic and types (turn resolver, instruction executor, religion, dominion, combat, graph generation, state filtering, WebSocket message protocol). Shared by server and client, and covered by Vitest. |
| [`server/`](server/) | Express + `ws` server. Lobby, game rooms, authoritative state, per-player filtered broadcasts. |
| [`client/`](client/) | React 19 + Vite UI. Zustand store, Three.js (`@react-three/fiber`) realm renderer with macro and micro views, and a flowchart instruction builder. |

Keeping the rules in a pure `shared` package means the server and client run the same code, and the logic can be tested without any network or UI.

## Getting started

Requires Node 20+.

```bash
npm install
npm run build:shared
npm run dev        # server on :3001, client via Vite
```

Other scripts:

```bash
npm test           # run the rules-engine test suite
npm run typecheck  # all workspaces
npm run lint
npm run build
```

## Design docs

The game was designed on paper first, and the documents are in [`docs/`](docs/):

- [Game design document](docs/game_design_document.md): mechanics, turn structure, resolved decisions and open questions
- [Design evaluation](docs/game_design_evaluation.md): critique and prioritisation of open design items
- [Lore](docs/lore/lore_complete.md): the Covenant, the Sundering and the five realms (Dominion, Entropy, Communion, Wrath, Memory)

## Status

Prototype. The core systems are implemented and tested, and the client is a work in progress.
