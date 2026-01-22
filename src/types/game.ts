export type GameScreen = 'home' | 'player-setup' | 'letter-selection' | 'playing' | 'review' | 'results'

export type GameMode = 'classic' | 'timer'

export interface Player {
    id: string
    name: string
    joinedAt: number;  // timestamp
    isHost?: boolean
}

export interface PlayerAnswers {
    [category: string]: string
}

export interface ValidationVote {
    validatorId: string
    playerId: string
    category: string
    isValid: boolean
}

export interface RoundData {
    turnPlayerIndex: number,  // Index of the player whose turn it is
    roundNumber: number
    letter?: string
    answers: Map<string, PlayerAnswers> // playerId -> answers
    validations: ValidationVote[]
    stoppedBy?: string
    stoppedAt?: number
}

export interface PlayerScore {
    playerId: string
    roundScore: number
    totalScore: number
}

// Local player state
export interface LocalState {
    player: Player
    host: string
    roomName: string
    screen: GameScreen
    peers: string[]
}

// Expanded GameStatus to represent all game states
export type GameStatus =
    | 'uninitialized'     // Home screen
    | 'waiting-peers'     // Waiting for peers to join
    | 'start'             // Start the game, starts first round
    | 'player-setup'      // Setting up players
    | 'letter-selection'  // Selecting letter for the round
    | 'round-started'           // Playing the round
    | 'review'            // Reviewing answers
    | 'results'           // Showing round results
    | 'ended';            // Game ended

// Global game state
export interface GameState {
    status: GameStatus
    mode: GameMode
    players: Player[]
    currentRound: number
    selectedLetter: string
    usedLetters: string[]
    categories: string[]
    roundData: RoundData | null
    timeRemaining: number
    scores: Map<string, number> // playerId -> total score
    reviewsSubmitted: Set<string> // playerIds who submitted reviews
}

export interface RoundResult {
    round: number
    letter: string
    playerScores: PlayerScore[]
}

// GAME EVENTS

export type GameEventType =
    'add-player'
    | 'set-waiting-status'
    | 'start-game'
    | 'start-round'
    | 'stop-round'

export interface GameEvent {
    type: GameEventType;
    id: string; // This should be "peer_id" + local_seq_no
    timestamp: number;
    payload: any;
}

export interface AddPlayer extends GameEvent {
    type: 'add-player';
    payload: Player;
}

export interface SetWaitingStatus extends GameEvent {
    type: 'set-waiting-status';
    payload: undefined;
}

export interface StartGameEvent extends GameEvent {
    type: 'start-game';
    payload: number; // starting playerIndex
}

export interface StartRoundEvent extends GameEvent {
    type: 'start-round'
    payload: string; // The character for this round
}

export interface StopRoundEvent extends GameEvent {
    type: 'stop-round'
    payload: any // TODO: define
}
