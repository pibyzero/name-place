import { useState, useCallback, useEffect } from 'react'
import {
    GameState,
    GameScreen,
    GameMode,
    Player,
    PlayerAnswers,
    ValidationVote,
    RoundData
} from '../types/game'
import { DEFAULT_CATEGORIES, TIMER_DURATION } from '../utils/constants'
import { calculateRoundScores } from '../utils/scoring'

const initialState: GameState = {
    status: 'uninitialized',
    mode: 'timer',
    players: [],
    currentPlayerId: '',
    currentRound: 1,
    selectedLetter: '',
    usedLetters: [],
    categories: DEFAULT_CATEGORIES,
    roundData: null,
    timeRemaining: TIMER_DURATION,
    scores: new Map(),
    reviewsSubmitted: new Set()
}

export interface GameActions {
    initGame: (host: Player, mode: GameMode) => {}
    startGame: (players: Player[], mode: GameMode) => {}
    proceedFromSetup: () => {},
    selectLetter: (letter: string) => {},
    setCurrentPlayer: (playerId: string) => {},
    updateAnswer: (playerId: string, category: string, answer: string) => {},
    stopRound: () => {},
    proceedToReview: () => {},
    submitReview: (validations: ValidationVote[]) => {},
    proceedToResults: () => {},
    nextRound: () => {},
    resetGame: () => {},
    endGame: () => {}
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

    // Auto proceed when timer ends
    useEffect(() => {
        if (gameState.timeRemaining === 0 && gameState.screen === 'playing' && gameState.mode === 'timer') {
            proceedToReview()
        }
    }, [gameState.timeRemaining, gameState.screen, gameState.mode])

    // Auto proceed when all reviews are submitted
    useEffect(() => {
        if (gameState.screen === 'review' &&
            gameState.reviewsSubmitted.size === gameState.players.length) {
            proceedToResults()
        }
    }, [gameState.screen, gameState.reviewsSubmitted.size, gameState.players.length])

    const setScreen = useCallback((screen: GameScreen) => {
        setGameState(prev => ({ ...prev, screen }))
    }, [])

    const startGame = useCallback((players: Player[], mode: GameMode) => {
        const scores = new Map<string, number>()
        players.forEach(p => scores.set(p.id, 0))

        setGameState(prev => ({
            ...prev,
            players,
            mode,
            currentPlayerId: players[0]?.id || '',
            scores
        }))
    }, [])

    const initGame = useCallback((host: Player, mode: GameMode) => {
        if (gameState.status != 'uninitialized') {
            alert!('initGame called for uninitialized game state. aborting!') // TODO error propagation
            return
        }
        host.isHost = true; // Ensure host
        let players = [host];

        const scores = new Map<string, number>()
        players.forEach(p => scores.set(p.id, 0))

        setGameState(prev => ({
            ...prev,
            status: 'waiting-peers',
            players,
            mode,
            currentPlayerId: players[0]?.id || '',
            scores
        }))

    }, [])

    const proceedFromSetup = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            screen: 'letter-selection'
        }))
    }, [])

    const selectLetter = useCallback((letter: string) => {
        const roundData: RoundData = {
            roundNumber: gameState.currentRound,
            letter,
            answers: new Map(),
            validations: []
        }

        // Initialize empty answers for all players
        gameState.players.forEach(player => {
            const emptyAnswers: PlayerAnswers = {}
            gameState.categories.forEach(cat => {
                emptyAnswers[cat] = ''
            })
            roundData.answers.set(player.id, emptyAnswers)
        })

        setGameState(prev => ({
            ...prev,
            selectedLetter: letter,
            screen: 'playing',
            timeRemaining: TIMER_DURATION,
            roundData,
            reviewsSubmitted: new Set()
        }))

        if (gameState.mode === 'timer') {
            setIsTimerActive(true)
        }
    }, [gameState.currentRound, gameState.players, gameState.categories, gameState.mode])

    const setCurrentPlayer = useCallback((playerId: string) => {
        setGameState(prev => ({
            ...prev,
            currentPlayerId: playerId
        }))
    }, [])

    const updateAnswer = useCallback((playerId: string, category: string, answer: string) => {
        setGameState(prev => {
            if (!prev.roundData) return prev

            const newAnswers = new Map(prev.roundData.answers)
            const playerAnswers = newAnswers.get(playerId) || {}
            playerAnswers[category] = answer
            newAnswers.set(playerId, playerAnswers)

            return {
                ...prev,
                roundData: {
                    ...prev.roundData,
                    answers: newAnswers
                }
            }
        })
    }, [])

    const stopRound = useCallback(() => {
        if (gameState.mode !== 'classic' || !gameState.roundData) return

        setGameState(prev => ({
            ...prev,
            roundData: {
                ...prev.roundData!,
                stoppedBy: prev.currentPlayerId,
                stoppedAt: Date.now()
            }
        }))

        // Give a moment for players to see the stop, then proceed
        setTimeout(() => {
            proceedToReview()
        }, 2000)
    }, [gameState.mode, gameState.roundData])

    const proceedToReview = useCallback(() => {
        setIsTimerActive(false)
        setGameState(prev => ({
            ...prev,
            screen: 'review',
            reviewsSubmitted: new Set()
        }))
    }, [])

    const submitReview = useCallback((validations: ValidationVote[]) => {
        setGameState(prev => {
            if (!prev.roundData) return prev

            const newReviewsSubmitted = new Set(prev.reviewsSubmitted)
            newReviewsSubmitted.add(prev.currentPlayerId)

            return {
                ...prev,
                roundData: {
                    ...prev.roundData,
                    validations: [...prev.roundData.validations, ...validations]
                },
                reviewsSubmitted: newReviewsSubmitted
            }
        })
    }, [])

    const proceedToResults = useCallback(() => {
        if (!gameState.roundData) return

        // Calculate and update scores
        const roundScores = calculateRoundScores(
            gameState.roundData.answers,
            gameState.roundData.validations,
            gameState.categories
        )

        const newScores = new Map(gameState.scores)
        roundScores.forEach((score, playerId) => {
            newScores.set(playerId, (newScores.get(playerId) || 0) + score)
        })

        setGameState(prev => ({
            ...prev,
            screen: 'results',
            scores: newScores
        }))
    }, [gameState.roundData, gameState.categories, gameState.scores])

    const nextRound = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            screen: 'letter-selection',
            currentRound: prev.currentRound + 1,
            selectedLetter: '',
            roundData: null,
            timeRemaining: TIMER_DURATION,
            reviewsSubmitted: new Set()
        }))
    }, [])

    const resetGame = useCallback(() => {
        setGameState(initialState)
    }, [])

    const endGame = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            screen: 'home'
        }))
    }, [])

    return {
        gameState,
        actions: {
            initGame,
            startGame,
            proceedFromSetup,
            selectLetter,
            setCurrentPlayer,
            updateAnswer,
            stopRound,
            proceedToReview,
            submitReview,
            proceedToResults,
            nextRound,
            resetGame,
            endGame
        } as GameActions
    }
}
