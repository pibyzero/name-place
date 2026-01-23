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
    | 'started'           // Start the game, starts first round
    | 'round-started'     // Playing the round
    | 'reviewing'         // Reviewing answers
    | 'ended';            // Game ended

export interface GameConfig {
    language: 'english' | 'nepali'
    maxPlayers: number // min is 3
    minRounds: number
}

// Global game state
export interface GameState {
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
    | 'set-waiting-status'
    | 'start-game'
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
