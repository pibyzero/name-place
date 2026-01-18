export type GameScreen = 'home' | 'player-setup' | 'letter-selection' | 'playing' | 'review' | 'results'

export type GameMode = 'classic' | 'timer'

export interface Player {
    id: string
    name: string
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
    roundNumber: number
    letter: string
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
    roomName: string
    screen: GameScreen
    playerName: string
    playerId: string
    peers: string[]
}

type GameStatus = "uninitialized" | 'waiting-peers' | 'started' | 'ended';

// Global game state
export interface GameState {
    status: GameStatus
    mode: GameMode
    players: Player[]
    currentPlayerId: string // move to local state
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
