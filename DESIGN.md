# Design — Name Place

## High-Level Architecture

No backend server. All game logic runs in the browser. Players communicate directly via WebRTC (PeerJS). The host acts as a relay node in a star topology.

```mermaid
graph TD
    subgraph Browser
        App[App.tsx — Coordinator]
        GS[useGameState — State Machine]
        P2P[useP2P — Networking]
        UI[Screen Components]
    end

    App -->|applies events| GS
    App -->|broadcasts events| P2P
    P2P -->|incoming events| App
    GS -->|gameState| App
    App -->|gameState + handlers| UI

    P2P <-->|WebRTC DataChannel| Peers[Other Players]
```

## Game State Machine

All screens map to a `GameStatus`. Transitions are driven by `GameEvent` objects applied to the state machine.

```mermaid
stateDiagram-v2
    [*] --> uninitialized
    uninitialized --> waiting_peers : init-game
    waiting_peers --> waiting_readiness : wait-round-readiness
    waiting_readiness --> round_ready : all players submit readiness
    round_ready --> round_started : start-round (letter selected)
    round_started --> reviewing : stop-round
    reviewing --> waiting_readiness : all reviews in (more rounds)
    reviewing --> ended : all reviews in (final round)
    ended --> [*]
```

## P2P Topology — Star with Host Relay

The host is the central node. Guests connect to the host, who relays events to all other peers. This avoids full-mesh complexity while keeping the architecture serverless.

```mermaid
graph TD
    Host((Host))
    G1((Guest 1))
    G2((Guest 2))
    G3((Guest 3))

    G1 <-->|DataConnection| Host
    G2 <-->|DataConnection| Host
    G3 <-->|DataConnection| Host
```

## Event Flow

Events are the single source of truth. Every state change is an event that gets applied locally and broadcast to peers.

```mermaid
sequenceDiagram
    participant P1 as Player 1 (Host)
    participant P2 as Player 2
    participant P3 as Player 3

    P2->>P1: game-events [submit-answers]
    P1->>P1: apply event locally
    P1->>P3: relay event

    P3->>P1: game-events [stop-round]
    P1->>P1: apply event locally
    P1->>P2: relay event
```

## Event Ordering & Sync

- **Event ID format:** `{peerId}-{sequenceNumber}` — globally unique
- **Vector clock:** each peer tracks the highest sequence number seen per peer
- **Deduplication:** applied event IDs stored in a `Set` — prevents double-application
- **Recovery:** if a peer suspects missing events, it sends `request-events-sync` with its vector clock; the responder replies with any events the requester hasn't seen

### Pending Buffer

Events that arrive out of order (e.g. `submit-round-readiness` before `wait-round-readiness`) are not discarded. Instead, `pureStateTransition` returns `null` for ordering rejections (vs `prev` for legitimate no-ops like duplicates). Rejected events go into a **priority-sorted pending buffer** and are retried after each successful apply.

Events are sorted by game-flow priority before retry:

| Priority | Event Types |
|---|---|
| 0 | `send-message`, `remove-player` (independent) |
| 1–2 | `init-game`, `add-player` |
| 3–5 | `set-waiting-peers`, `wait-round-readiness`, `submit-round-readiness` |
| 6–8 | `start-round`, `submit-answers`/`stop-round`, `submit-review` |

Tiebreaker within same priority: timestamp. Pending events expire after 30 seconds.

```mermaid
flowchart TD
    A[Receive events] --> B[Merge with pending buffer]
    B --> C[Dedup + sort by priority]
    C --> D{Try apply}
    D -->|null — ordering| E[Keep in pending]
    D -->|prev — dedup/stale| F[Mark applied, drop]
    D -->|new state| G[Mark applied, update state]
    G --> H{More pending?}
    H -->|Yes| D
    H -->|No| I[Done — render]
    E --> H
```

## P2P Message Types

| Message | Direction | Purpose |
|---|---|---|
| `join-handshake` | Guest → Host | New player announces itself |
| `handshake` | Host → Guest | Host acknowledges join |
| `peer-list` | Host → All | Broadcast list of connected peer IDs |
| `game-events` | Any → Host → All | Game state transitions |
| `request-events-sync` | Any → Any | Request missing events via vector clock |
| `events-sync-response` | Any → Requester | Reply with missing events |

## Module Structure

```mermaid
graph TB
    subgraph Components
        Screens[screens/]
        UIKit[ui/]
    end

    subgraph Hooks
        useGameState[useGameState.ts]
        useP2P[useP2p.ts]
    end

    subgraph Utils
        p2pUtils[p2p.ts]
        scoring[scoring.ts]
        constants[constants.ts]
    end

    subgraph Types
        gameTypes[game.ts]
        p2pTypes[p2p.ts]
        commonTypes[common.ts]
    end

    App[App.tsx] --> Screens
    App --> UIKit
    App --> useGameState
    App --> useP2P
    useP2P --> p2pUtils
    useGameState --> gameTypes
    useP2P --> p2pTypes
    Screens --> scoring
    Screens --> constants
```

## Scoring

- 1 point per category if the answer is voted valid by majority (>50% of reviewers)
- 0 points if invalid or blank
- Cumulative across all rounds
- Final leaderboard ranks by total score
