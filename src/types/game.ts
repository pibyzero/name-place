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

export interface GameState {
    screen: GameScreen
    mode: GameMode
    players: Player[]
    currentPlayerId: string
    currentRound: number
    selectedLetter: string
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