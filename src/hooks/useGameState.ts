import { useState, useCallback, useEffect } from 'react'
import {
    GameState,
    GameMode,
    Player,
    PlayerAnswers,
    ValidationVote,
    RoundData,
    GameEvent
} from '../types/game'
import { DEFAULT_CATEGORIES, TIMER_DURATION } from '../utils/constants'
import { calculateRoundScores } from '../utils/scoring'

const initialState: GameState = {
    status: 'uninitialized',
    mode: 'classic',
    players: [],
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
    setWaitingPeers: () => {}
    startGame: (players: Player[], mode: GameMode) => {}
    proceedFromSetup: () => {},
    selectLetter: (letter: string) => {},
    setCurrentPlayer: (playerId: string) => {},
    updateAnswer: (playerId: string, category: string, answer: string) => {},
    addPlayer: (p: Player) => {},
    stopRound: () => {},
    proceedToReview: () => {},
    submitReview: (validations: ValidationVote[]) => {},
    proceedToResults: () => {},
    nextRound: () => {},
    resetGame: () => {},
    endGame: () => {}
    applyEvent: (ev: GameEvent) => {}
    applyEvents: (evs: GameEvent[]) => {}
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

    // just dedup players
    useEffect(() => {
        const seen = new Set<string>();
        const dedupedPlayers = gameState.players.filter(player => {
            if (seen.has(player.id)) return false;
            seen.add(player.id);
            return true;
        });

        if (dedupedPlayers.length !== gameState.players.length) {
            setGameState(prev => ({ ...prev, players: dedupedPlayers }));
        }
    }, [gameState.players]);

    // Auto proceed when timer ends
    useEffect(() => {
        if (gameState.timeRemaining === 0 && gameState.status === 'round-started' && gameState.mode === 'timer') {
            proceedToReview()
        }
    }, [gameState.timeRemaining, gameState.status, gameState.mode])

    // Auto proceed when all reviews are submitted
    useEffect(() => {
        if (gameState.status === 'review' &&
            gameState.reviewsSubmitted.size === gameState.players.length) {
            proceedToResults()
        }
    }, [gameState.status, gameState.reviewsSubmitted.size, gameState.players.length])

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

    const setWaitingPeers = useCallback(() => {
        if (gameState.status != 'uninitialized') {
            alert!('initGame called for uninitialized game state. aborting!') // TODO error propagation
            return
        }
        setGameState(prev => ({
            ...prev,
            status: 'waiting-peers',
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

    const addPlayer = useCallback((player: Player) => {
        // Do not add if already exists
        if (gameState.players.map(x => x.id).includes(player.id)) {
            return
        }
        // Also, maintain the joining sequence
        setGameState(prev => {
            let newplayers = [...prev.players, player]
            newplayers.sort((a, b) => a.joinedAt - b.joinedAt)
            return {
                ...prev,
                scores: { ...prev.scores, [player.id]: 0 },
                players: newplayers
            }
        })
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

    const applyEvent = useCallback((ev: GameEvent) => {
        switch (ev.type) {
            case 'add-player':
                addPlayer(ev.payload)
                break;
            case 'set-waiting-status':
                setGameState(prev => ({ ...prev, status: 'waiting-peers' }))
                break;
            case 'start-game':
                let startPlayerId = ev.payload
                let roundData: RoundData = {
                    turnPlayerIndex: startPlayerId,
                    roundNumber: 0,
                    answers: {} as Map<string, PlayerAnswers>,
                    validations: [],
                }
                setGameState(prev => ({ ...prev, status: 'start', roundData }))
                break;
            case 'start-round':
                let char = ev.payload;
                if (!gameState.roundData) {
                    console.warn("Invalid 'start-round' event received. Ignoring")
                    return
                }
                setGameState(prev => ({
                    ...prev,
                    status: 'round-started',
                    roundData: {
                        ...prev.roundData as RoundData,
                        letter: char,
                    }
                }))
                break;
        }
    }, [gameState])

    const applyEvents = useCallback((evs: GameEvent[]) => {
        evs.forEach(applyEvent)
    }, [gameState])

    return {
        gameState,
        actions: {
            setWaitingPeers,
            startGame,
            proceedFromSetup,
            selectLetter,
            setCurrentPlayer,
            addPlayer,
            updateAnswer,
            proceedToReview,
            submitReview,
            proceedToResults,
            nextRound,
            resetGame,
            endGame,
            applyEvent,
            applyEvents
        } as GameActions
    }
}
