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

export type AnswersValidity = Record<string, boolean>
export type PlayersAnswersValidity = Record<string, AnswersValidity>

export interface AnswersReview {
    reviewer: string
    // TODO: better name
    reviews: PlayersAnswersValidity  // playerId -> category answers validity
}

export interface RoundData {
    turnPlayerIndex: number,  // Index of the player whose turn it is
    roundNumber: number
    letter?: string
    answers: Record<string, PlayerAnswers> // playerId -> answers
    reviews: Record<string, AnswersReview>
    stoppedBy?: string
    stoppedAt?: number
    readyPlayers: Set<string>
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
}

// Expanded GameStatus to represent all game states
export type GameStatus =
    | 'uninitialized'     // Home screen
    | 'waiting-peers'     // Waiting for peers to join
    | 'waiting-readiness' // Wait for readiness
    | 'round-ready'       // all players are ready for the round
    | 'round-started'     // Playing the round
    | 'reviewing'         // Reviewing answers
    | 'ended';            // Game ended

export type Language = 'english' | 'nepali'
export interface GameConfig {
    language: Language
    maxPlayers: number // min is 3
    numRounds: number
}

// Global game state
export interface GameState {
    config: GameConfig
    status: GameStatus
    mode: GameMode
    players: Player[]
    currentRound: number
    categories: string[]
    roundData: RoundData | null // Current round data
    allRounds: RoundData[]
    timeRemaining: number
}

export interface RoundResult {
    round: number
    letter: string
    playerScores: PlayerScore[]
}

// GAME EVENTS

export type GameEventType =
    'add-player'
    | 'remove-player'
    | 'init-game'
    | 'set-waiting-peers'
    | 'wait-round-readiness'
    | 'submit-round-readiness'
    | 'start-round'
    | 'stop-round'
    | 'submit-answers'
    | 'submit-review'

export interface GameEvent {
    type: GameEventType;
    id: string; // This should be "peer_id" + local_seq_no
    timestamp: number;
    payload: any;
}

export interface SubmitRoundReadinessData {
    ready: boolean
    submittedBy: string
}

export interface AddPlayer extends GameEvent {
    type: 'add-player';
    payload: Player;
}

export interface RemovePlayer extends GameEvent {
    type: 'remove-player';
    payload: string;
}


export interface InitGameEvent extends GameEvent {
    type: 'init-game'
    payload: GameConfig
}

export interface SetWaitingPeers extends GameEvent {
    type: 'set-waiting-peers';
    payload: undefined;
}

export interface WaitRoundReadinessEvent extends GameEvent {
    type: 'wait-round-readiness';
    payload: number; // starting playerIndex
}

export interface SubmitRoundReadinessEvent extends GameEvent {
    type: 'submit-round-readiness'
    payload: SubmitRoundReadinessData
}

export interface StartRoundEvent extends GameEvent {
    type: 'start-round'
    payload: string; // The character for this round
}

export interface StopRoundEvent extends GameEvent {
    type: 'stop-round'
    payload: AnswersData
}

export interface SubmitAnswersEvent extends GameEvent {
    type: 'submit-answers'
    payload: AnswersData
}

export interface SubmitReviewEvent extends GameEvent {
    type: 'submit-review'
    payload: ReviewData
}

export interface AnswersData {
    answers: PlayerAnswers  // answers by the player
    round: number
    submittedBy: string     // player id
}

export interface ReviewData {
    answersReview: AnswersReview  // answers by the player
    round: number
    submittedBy: string     // player id
}
