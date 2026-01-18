# Name Place Animal Thing - Technical Specification

## Overview
A multiplayer word game where players race to fill in categories starting with a randomly selected letter. Built as a peer-to-peer web application with CRDT-based state synchronization.

---

## Game Rules

### Setup
- 2-8 players join a room using a 6-letter room code
- Host configures game settings:
  - Mode: "Classic" (first to stop) or "Timer" (fixed duration)
  - Letter Selection: "Player Choice" (players take turns) or "Random" (auto-generated)
  - End Condition: "Endless" (play until host ends) or "Fixed Rounds" (5/10/15/20 rounds)
  - Categories: Default is Name, Surname, Place, Animal, Food, Movie (add/edit/remove)
  - Timer duration (if Timer mode): 30/60/90 seconds

### Gameplay Loop
1. **Round Start**: 
   - **Player Choice mode**: Current player (rotating turn order) selects a letter (A-Z)
   - **Random mode**: Letter is randomly generated (A-Z)
   - First player is randomly assigned at game start
2. **Playing Phase**: 
   - Players fill in answers for each category starting with that letter
   - **Classic Mode**: First player to finish hits "Stop" button, round ends immediately for everyone
   - **Timer Mode**: Round ends when timer expires
3. **Review Phase**: 
   - All players see everyone's answers in a grid
   - Players validate other players' answers (✓ Valid / ✗ Invalid)
   - Cannot validate own answers
   - Players see who has submitted reviews, but not individual votes
   - Auto-proceed after all reviews submitted or 30-second timeout
4. **Scoring**:
   - Answer is valid if majority of validators mark it valid
   - Unique valid answer: 10 points
   - Duplicate valid answer (2+ players): 5 points
   - Invalid/empty: 0 points
5. **Results**: Show round scores and cumulative totals
6. Repeat for next round

### Game End
- **Endless Mode**: Host can click "End Game" at any time after any round
- **Fixed Rounds Mode**: Game auto-ends after N rounds, but host can still end early
- After game ends: Show final leaderboard with total scores
- Options: [Play Again] (reset scores, same settings) or [New Game] (back to lobby)

---

## Technical Architecture

### Tech Stack
- **Frontend**: React (create-react-app or Vite)
- **State Management**: Yjs (CRDT library)
- **Networking**: y-webrtc (WebRTC provider for Yjs)
- **Signaling**: Public Yjs signaling server (`wss://signaling.yjs.dev`)
- **Styling**: Tailwind CSS or CSS Modules
- **Build**: Vite (faster than CRA)

**Bundle Size Target**: ~150-200KB gzipped

### CRDT Data Model

```javascript
// Yjs shared document structure
{
  // G-Set: Players (grow-only)
  players: Y.Array<{
    id: string,           // Unique peer ID
    name: string,
    joinedAt: timestamp,
    connected: boolean    // Updated via awareness
  }>,
  
  // LWW: Game configuration
  config: Y.Map<{
    mode: "classic" | "timer",
    letterSelection: "player" | "random",
    endCondition: "endless" | "fixed",
    totalRounds: number | null,  // null for endless, 5/10/15/20 for fixed
    categories: string[],  // Default: ["Name", "Surname", "Place", "Animal", "Food", "Movie"]
    timerDuration: number, // seconds (30/60/90)
    hostId: string
  }>,
  
  // LWW: Current round state
  currentRound: Y.Map<{
    number: number,
    letter: string,
    currentTurnPlayerId: string,  // Who selects letter this round (player mode only)
    status: "waiting" | "selecting" | "playing" | "reviewing" | "results",
    startedAt: timestamp,
    stoppedAt: timestamp | null,
    stoppedBy: playerId | null
  }>,
  
  // Nested Map: Player answers per round
  answers: Y.Map<roundNumber, Y.Map<playerId, Y.Map<{
    [category]: string,
    submittedAt: timestamp
  }>>>,
  
  // G-Set: Validations
  validations: Y.Map<roundNumber, Y.Array<{
    playerId: string,      // Whose answer
    category: string,
    validatorId: string,   // Who validated
    vote: "valid" | "invalid",
    timestamp: number
  }>>,
  
  // Nested Map: Review submission tracking
  reviewsSubmitted: Y.Map<roundNumber, Y.Map<playerId, boolean>>,
  
  // LWW Map: Cumulative scores
  scores: Y.Map<playerId, number>
}
```

### Conflict Resolution Rules

1. **Player joins**: G-Set ensures all additions are preserved
2. **Stop button**: Earliest `stoppedAt` timestamp wins (first to stop)
3. **Answer submission**: Last-write-wins per field per player
4. **Validations**: All votes preserved in G-Set, calculate majority at score time
5. **Host disconnect**: No explicit re-election needed - any connected peer can advance rounds

---

## UI/UX Design

### Design Language
- **Aesthetic**: Nostalgic/playful, casual/friendly
- **Colors**:
  - Background: Warm cream `#FAF7F0`
  - Primary: Soft coral `#FF9B82`
  - Secondary: Muted teal `#7CB9B0`
  - Text: Charcoal `#2D3436`
  - Accent: Warm yellow `#FFD97D`
- **Typography**:
  - Headings: Nunito or Quicksand (rounded, friendly)
  - Body: Inter (clean, readable)
- **Styling**: Rounded corners, soft shadows, subtle paper texture
- **Animations**: Gentle hover scales (1.02x), fade-ins with soft bounce

### Screen Flows (SPA with transitions)

#### 1. Home/Create Room
```
┌────────────────────────────────────┐
│   🎮 Name Place Animal Thing       │
│                                    │
│   Enter your name:                 │
│   [____________]                   │
│                                    │
│   [Create Room]  [Join Room]       │
└────────────────────────────────────┘
```

#### 2. Lobby
```
┌────────────────────────────────────┐
│   🎮 Name Place Animal Thing       │
│                                    │
│   Room Code: ABCDEF [📋 Copy]      │
│                                    │
│   Players (3):                     │
│   ┌──────────────────────┐        │
│   │ 👤 Alice (You, Host)  │        │
│   │ 👤 Sarah              │        │
│   │ 👤 Mike               │        │
│   └──────────────────────┘        │
│                                    │
│   Game Settings: (host only)      │
│   Mode: ⚪ Classic ⚪ Timer         │
│   Letters: ⚪ Player Choice ⚪ Random│
│   End: ⚪ Endless ⚪ Fixed [10▼]    │
│   Categories: [Edit]               │
│   Name, Surname, Place, Animal...  │
│                                    │
│   [Start Game]                     │
└────────────────────────────────────┘
```

**Category Edit Modal** (when [Edit] clicked):
```
┌────────────────────────────────────┐
│   Edit Categories                  │
│                                    │
│   ┌──────────────────────┐        │
│   │ Name            [✗]   │        │
│   │ Surname         [✗]   │        │
│   │ Place           [✗]   │        │
│   │ Animal          [✗]   │        │
│   │ Food            [✗]   │        │
│   │ Movie           [✗]   │        │
│   └──────────────────────┘        │
│                                    │
│   Add new: [________] [+ Add]      │
│                                    │
│   [Done]                           │
└────────────────────────────────────┘
```

#### 3. Letter Selection (Player Choice Mode Only)
```
┌────────────────────────────────────┐
│   Round 3 / 10                     │
│                                    │
│   Sarah, choose a letter:          │
│                                    │
│   A B C D E F G H I J K L M        │
│   N O P Q R S T U V W X Y Z        │
│                                    │
│   (Others waiting...)              │
│   ⏳ Alice, Mike                    │
└────────────────────────────────────┘
```
*Note: "Round 3 / 10" shown in Fixed Rounds mode, just "Round 3" in Endless mode*

#### 4. Active Round (Classic Mode)
```
┌────────────────────────────────────┐
│   Round 3 / 10 • Letter: B         │
│   Sarah is still playing...        │
│                                    │
│   Category        Your Answer      │
│   ─────────────────────────────   │
│   Name           [Bob_____]  ✓     │
│   Surname        [Brown___]  ✓     │
│   Place          [Boston__]  ✓     │
│   Animal         [Bear____]  ✓     │
│   Food           [Bread___]  ✓     │
│   Movie          [Batman__]  ✓     │
│                                    │
│   [🛑 Stop!]                       │
└────────────────────────────────────┘
```
*Note: "Round 3 / 10" shown in Fixed Rounds mode, just "Round 3" in Endless mode*

#### 5. Active Round (Timer Mode)
```
┌────────────────────────────────────┐
│   Round 3 • Letter: B              │
│   ⏱️ 00:42                          │
│                                    │
│   Category        Your Answer      │
│   ─────────────────────────────   │
│   Name           [Bob_____]        │
│   Place          [Boston__]        │
│   Animal         [Bear____]        │
│   Thing          [________]        │
│                                    │
└────────────────────────────────────┘
```

#### 6. Review Phase
```
┌────────────────────────────────────┐
│   Review Round 3 Answers           │
│                                    │
│   Waiting for reviews:             │
│   ✓ Sarah  ⏳ Mike  ⏳ You          │
│                                    │
│   Player    Name    Surname Place  │
│   ────────────────────────────────│
│   You       Bob     Brown   Boston │
│   (Alice)   [highlighted row]      │
│                                    │
│   Sarah     Barack  Obama   Brazil │
│             ✓ ✗     ✓ ✗     ✓ ✗   │
│                                    │
│   Mike      Biden   —       Bangkok│
│             ✓ ✗     ✓ ✗     ✓ ✗   │
│                                    │
│   [Scroll to see more categories →]│
│   [Submit Review]                  │
└────────────────────────────────────┘
```

**Mobile Version**: Cards instead of table, swipe between players

#### 7. Round Results
```
┌────────────────────────────────────┐
│   🏆 Round 3 Results                │
│                                    │
│   🥇 Sarah ───────── 35 pts        │
│      Name: Barack (unique) +10     │
│      Place: Brazil (dup) +5        │
│      Animal: Bat (dup) +5          │
│      Thing: Book (unique) +10      │
│                                    │
│   🥈 You (Alice) ─── 30 pts        │
│      [breakdown...]                │
│                                    │
│   🥉 Mike ────────── 25 pts        │
│      [breakdown...]                │
│                                    │
│   Overall Scores:                  │
│   Sarah: 95 | You: 85 | Mike: 70   │
│                                    │
│   [Next Round]  [End Game]         │
└────────────────────────────────────┘
```

---

## Implementation Guide

### Phase 1: Project Setup
1. Initialize Vite React project: `npm create vite@latest name-place-thing -- --template react`
2. Install dependencies:
   ```bash
   npm install yjs y-webrtc
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
3. Set up Tailwind config with custom colors
4. Create folder structure:
   ```
   src/
   ├── components/
   │   ├── Lobby.jsx
   │   ├── ActiveRound.jsx
   │   ├── ReviewPhase.jsx
   │   ├── Results.jsx
   │   └── shared/
   ├── hooks/
   │   ├── useYjs.js
   │   └── useGameState.js
   ├── utils/
   │   ├── scoring.js
   │   └── constants.js
   ├── App.jsx
   └── main.jsx
   ```

### Phase 2: Core Yjs Integration
1. Create `useYjs` hook:
   - Initialize Y.Doc
   - Set up WebrtcProvider with room ID
   - Handle awareness (online/offline status)
   - Clean up on unmount
2. Create `useGameState` hook:
   - Wrapper around Yjs observables
   - React state sync with Yjs maps/arrays
   - Helper functions for common operations

### Phase 3: UI Components
Build in order:
1. **Lobby**: Room creation, player list, settings
2. **ActiveRound**: Input form, stop button, timer
3. **ReviewPhase**: Answer grid, validation buttons
4. **Results**: Score display, round breakdown

### Phase 4: Game Logic
1. Implement round management:
   - **Letter selection**: 
     - Player mode: Track turn order (circular), UI for letter picker
     - Random mode: Generate random A-Z on round start
   - Round state transitions
   - Stop button logic
2. Implement validation logic:
   - Vote collection
   - Majority calculation
   - Duplicate detection
3. Implement scoring:
   - Point calculation per answer
   - Cumulative score tracking
4. **Room code generation**:
   - Generate random 6-letter uppercase code (A-Z)
   - Check for uniqueness (minimal collision risk with 26^6 possibilities)
5. **Rejoin logic**:
   - Store `{roomId, playerName, playerId}` in localStorage when first joining
   - On reconnect/refresh:
     - Check if room still exists in Yjs network
     - If playerId still exists in room's player list → seamless rejoin (ignore name)
     - If playerId doesn't exist (room reset/kicked) → join as new player with new ID
   - Name conflicts only matter for NEW joins, not rejoins
   - On new join with duplicate name, prompt user to choose different name

### Phase 5: Polish
1. Add animations (Framer Motion or CSS transitions)
2. Mobile responsive layouts
3. Error handling (disconnections, invalid states)
4. Loading states
5. Toast notifications for events

### Phase 6: Testing
1. Test with 2-8 players
2. Test disconnection/reconnection
3. Test validation edge cases (ties, missing votes)
4. Cross-browser testing (Chrome, Firefox, Safari)

---

## Key Algorithms

### Stop Button Logic (Classic Mode)
```javascript
function handleStop(playerId) {
  const currentStop = currentRound.get('stoppedAt');
  const now = Date.now();
  
  // First to stop wins (CRDT ensures earliest timestamp preserved)
  if (!currentStop || now < currentStop) {
    currentRound.set('stoppedAt', now);
    currentRound.set('stoppedBy', playerId);
    currentRound.set('status', 'reviewing');
  }
}
```

### Validation Calculation
```javascript
function calculateAnswerValidity(roundNum, playerId, category) {
  const validations = getValidationsForAnswer(roundNum, playerId, category);
  
  // Group by validator (take latest vote per validator)
  const latestVotes = {};
  validations.forEach(v => {
    if (!latestVotes[v.validatorId] || v.timestamp > latestVotes[v.validatorId].timestamp) {
      latestVotes[v.validatorId] = v;
    }
  });
  
  // Count valid vs invalid
  const votes = Object.values(latestVotes);
  const validCount = votes.filter(v => v.vote === 'valid').length;
  const invalidCount = votes.filter(v => v.vote === 'invalid').length;
  
  // Majority wins, tie defaults to valid
  return validCount >= invalidCount;
}
```

### Duplicate Detection
```javascript
function findDuplicates(roundNum, category) {
  const answers = getAllAnswersForCategory(roundNum, category);
  const normalizedAnswers = {};
  
  answers.forEach(({ playerId, answer }) => {
    const normalized = answer.toLowerCase().trim();
    if (!normalizedAnswers[normalized]) {
      normalizedAnswers[normalized] = [];
    }
    normalizedAnswers[normalized].push(playerId);
  });
  
  return Object.values(normalizedAnswers)
    .filter(players => players.length > 1)
    .flat();
}
```

### Scoring
```javascript
function calculateRoundScores(roundNum) {
  const scores = {};
  
  config.get('categories').forEach(category => {
    const duplicatePlayers = findDuplicates(roundNum, category);
    
    getAllPlayers().forEach(playerId => {
      const answer = getAnswer(roundNum, playerId, category);
      if (!answer || answer.trim() === '') {
        scores[playerId] = (scores[playerId] || 0) + 0;
        return;
      }
      
      const isValid = calculateAnswerValidity(roundNum, playerId, category);
      if (!isValid) {
        scores[playerId] = (scores[playerId] || 0) + 0;
        return;
      }
      
      const isDuplicate = duplicatePlayers.includes(playerId);
      scores[playerId] = (scores[playerId] || 0) + (isDuplicate ? 5 : 10);
    });
  });
  
  return scores;
}
```

---

## Edge Cases & Handling

### Player Disconnection
- **During playing**: Their answers are preserved, they can rejoin
- **During review**: Votes not submitted count as abstaining
- **Timeout**: 30 seconds after last player submits, auto-calculate scores

### Network Partition
- Yjs CRDTs handle this automatically on reconnection
- May see delayed updates, but state will converge

### Host Leaves
- No special handling needed - any player can advance rounds
- Could add visual indicator of who's "driving" the game

### Invalid Inputs
- Empty answers: Treated as 0 points
- Non-letter characters: Allowed (e.g., "O'Brien" for letter O)
- Case insensitive matching for duplicates

### Same Answer Validation
- Normalize: lowercase, trim whitespace
- Consider "New York" and "new york" as duplicates
- Don't normalize beyond that (e.g., "New York" ≠ "NYC")

---

## Future Enhancements (Out of Scope for V1)

- [ ] Custom category creation in-game
- [ ] Saved game history/stats
- [ ] Different scoring modes (bonus for speed, etc.)
- [ ] Chat/emoji reactions
- [ ] Sound effects
- [ ] Dark mode
- [ ] Spectator mode
- [ ] Tournament bracket mode
- [ ] AI opponent option

---

## Success Criteria

**V1 is complete when:**
- ✅ 2-8 players can join a room via code
- ✅ Both Classic and Timer modes work correctly
- ✅ Answer validation produces accurate scores
- ✅ UI matches design spec (nostalgic/playful aesthetic)
- ✅ Works on desktop and mobile (responsive)
- ✅ No crashes with normal disconnection/reconnection
- ✅ Bundle size < 250KB gzipped

---

## Development Timeline Estimate

- **Phase 1-2** (Setup + Yjs): 4-6 hours
- **Phase 3** (UI Components): 8-10 hours
- **Phase 4** (Game Logic): 6-8 hours
- **Phase 5** (Polish): 4-6 hours
- **Phase 6** (Testing): 4-6 hours

**Total**: ~26-36 hours for solo developer

---

## Resources

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-webrtc GitHub](https://github.com/yjs/y-webrtc)
- [CRDT Explainer](https://crdt.tech/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Authors**: Collaborative design session
