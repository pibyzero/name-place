import { useState, useCallback, useEffect } from 'react'
import { GameState, GameScreen } from '../types/game'
import { DEFAULT_CATEGORIES, TIMER_DURATION } from '../utils/constants'

const initialState: GameState = {
  screen: 'home',
  playerName: '',
  currentRound: 1,
  selectedLetter: '',
  categories: DEFAULT_CATEGORIES,
  answers: {},
  timeRemaining: TIMER_DURATION,
  roundScores: [],
  totalScore: 0,
}

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialState)
  const [isTimerActive, setIsTimerActive] = useState(false)

  // Timer effect
  useEffect(() => {
    if (!isTimerActive || gameState.timeRemaining <= 0) return

    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeRemaining: prev.timeRemaining - 1
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerActive, gameState.timeRemaining])

  // Auto submit when timer ends
  useEffect(() => {
    if (gameState.timeRemaining === 0 && gameState.screen === 'playing') {
      submitRound()
    }
  }, [gameState.timeRemaining, gameState.screen])

  const setScreen = useCallback((screen: GameScreen) => {
    setGameState(prev => ({ ...prev, screen }))
  }, [])

  const setPlayerName = useCallback((playerName: string) => {
    setGameState(prev => ({ ...prev, playerName }))
  }, [])

  const selectLetter = useCallback((letter: string) => {
    setGameState(prev => ({
      ...prev,
      selectedLetter: letter,
      screen: 'playing',
      timeRemaining: TIMER_DURATION,
      answers: {}
    }))
    setIsTimerActive(true)
  }, [])

  const updateAnswer = useCallback((category: string, answer: string) => {
    setGameState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [category]: answer
      }
    }))
  }, [])

  const submitRound = useCallback(() => {
    setIsTimerActive(false)

    // Calculate score (placeholder logic for now)
    const filledAnswers = Object.values(gameState.answers).filter(a => a.trim())
    const score = filledAnswers.length * 10

    setGameState(prev => ({
      ...prev,
      screen: 'results',
      roundScores: [...prev.roundScores, score],
      totalScore: prev.totalScore + score
    }))
  }, [gameState.answers])

  const nextRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      screen: 'letter-selection',
      currentRound: prev.currentRound + 1,
      selectedLetter: '',
      answers: {},
      timeRemaining: TIMER_DURATION
    }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState({
      ...initialState,
      playerName: gameState.playerName
    })
  }, [gameState.playerName])

  return {
    gameState,
    actions: {
      setScreen,
      setPlayerName,
      selectLetter,
      updateAnswer,
      submitRound,
      nextRound,
      resetGame
    }
  }
}
