# Decisions

- **PeerJS for P2P over WebSocket server:** WebSockets require a persistent server that doesn't scale well for peer-to-peer use cases. PeerJS abstracts WebRTC and handles peer discovery, connection management, and NAT traversal out of the box.
- **Star topology (host relays) over full mesh:** Full mesh connections grow as O(n²). Star with host relay keeps connections at O(n) while still being fully serverless.
- **Event-sourced state machine over shared mutable state:** All state transitions are `GameEvent` objects applied deterministically. This makes the system idempotent, debuggable, and naturally suited to P2P replication.
- **Vector clocks for event ordering:** Simple timestamps aren't reliable across devices. Vector clocks (peerId → sequenceNumber) allow each peer to detect missing events and request sync.
- **React 19 with hooks only, no state management library:** Game state is localized to a single reducer-style hook. Adding Redux/Zustand would add complexity without meaningful benefit at this scale.
- **Tailwind CSS over component library:** Keeps the bundle small, avoids opinionated component styles, and gives full control over the responsive mobile-first design.
- **Vite over CRA/webpack:** Faster dev server, simpler config, native ESM support.
- **GitHub Pages deployment:** Free hosting, sufficient for a static SPA with no backend.
- **English + Nepali language support:** Nepali alphabet included to support Nepali-speaking players — a primary audience for this game.
- **Majority vote for answer validation:** No dictionary API or automated checking — keeps the game serverless and lets players decide what's valid, which is more fun and handles edge cases humans understand.
- **TURN/STUN servers via env vars:** Local dev uses no ICE servers (localhost). Production uses metered.ca TURN/STUN, configured via `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` to work behind NATs.
- **Priority-sorted pending buffer over discard-on-reject:** Events arriving out of order were permanently lost (marked as applied even when guards rejected them). A pending buffer with priority-based retry ensures events are applied in game-flow order regardless of network delivery order. `pureStateTransition` returns `null` for ordering rejections vs `prev` for legitimate no-ops (duplicates/stale), so the caller can distinguish bufferable from droppable.
- **Refs over React state for event tracking:** `appliedEventIds`, `appliedEvents`, and `pendingEvents` moved to refs to avoid stale closures in event processing and side effects inside React state updaters. Only `gameState` uses `useState` (for rendering).
