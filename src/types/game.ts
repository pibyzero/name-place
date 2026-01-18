export type GameScreen = 'home' | 'letter-selection' | 'playing' | 'results'

export interface GameState {
  screen: GameScreen
  playerName: string
  currentRound: number
  selectedLetter: string
  categories: string[]
  answers: Record<string, string>
  timeRemaining: number
  roundScores: number[]
  totalScore: number
}

export interface RoundResult {
  round: number
  letter: string
  answers: Record<string, string>
  score: number
}