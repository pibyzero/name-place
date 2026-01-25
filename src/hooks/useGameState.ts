import { useState, useCallback, useEffect, useMemo } from 'react'
import {
    GameState,
    GameEvent,
    AnswersData,
    GameStatus,
    ReviewData,
    SubmitRoundReadinessData
} from '../types/game'
import { DEFAULT_CATEGORIES, TIMER_DURATION } from '../utils/constants'

const initialState: GameState = {
    status: 'uninitialized',
    mode: 'classic',
    players: [],
    currentRound: 1,
    categories: DEFAULT_CATEGORIES,
    roundData: null,
    allRounds: [],
    timeRemaining: TIMER_DURATION,
    config: {
        numRounds: 5,
        maxPlayers: 4,
        language: 'english'
    },
}

export interface GameActions {
    applyEvent: (ev: GameEvent) => void
    applyEvents: (evs: GameEvent[]) => void
}

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState>(initialState)
    /// To store all applied game events
    const [_appliedEvents, setAppliedEvents] = useState<GameEvent[]>([]);
    /// Index of applied game event ids
    const [appliedEventIds, setAppliedEventIds] = useState<Set<string>>(new Set())

    const getPlayerName = useCallback((pid: string) => {
        return gameState.players.filter(p => p.id == pid)[0]?.name
    }, [gameState])

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

    const handleInitGame = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            // TODO: this is a hack, it should only be 'uninitialized', but ordering is not maintained so there's some issue
            if (!['uninitialized', 'waiting-peers'].includes(prev.status)) {
                console.warn("Initing uninitialized game")
                return prev
            }
            console.warn("APPLYING config", ev.payload)
            return {
                ...prev,
                status: 'waiting-peers',
                config: ev.payload
            }
        })
    }, [])

    const handleAddPlayer = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            if (!['waiting-peers', 'uninitialized'].includes(prev.status)) return prev
            if (prev.players.map(x => x.id).includes(ev.payload.id)) return prev

            let newplayers = [...prev.players, ev.payload]
            newplayers.sort((a, b) => a.joinedAt - b.joinedAt)
            return {
                ...prev,
                players: newplayers
            }
        })
    }, [])

    const handleSetWaitingPeers = useCallback(() => {
        setGameState(prev => ({ ...prev, status: 'waiting-peers' }))
    }, [])

    const handleWaitReadiness = useCallback((ev: GameEvent) => {
        setGameState(prev => ({
            ...prev,
            status: 'waiting-readiness',
            roundData: {
                turnPlayerIndex: ev.payload,
                roundNumber: prev.currentRound,
                answers: {},
                reviews: {},
                readyPlayers: new Set()
            }
        }))
    }, [])

    const handleSubmitRoundReadiness = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            let data = ev.payload as SubmitRoundReadinessData
            if (prev.status !== 'waiting-readiness') {
                console.warn("Received round readiness status when game is not waiing for readiness. ignoring")
                return prev
            }
            if (!prev.roundData) {
                console.warn("Invalid state of game: roundData not present. aborting event")
                return prev
            }
            let rd = prev.roundData
            let readyPlayers = rd?.readyPlayers
            readyPlayers?.add(data.submittedBy)
            let st = prev.status as GameStatus
            if (readyPlayers?.size == prev.players.length) {
                st = 'round-ready'
            }
            return {
                ...prev,
                status: st,
                roundData: {
                    ...prev.roundData,
                    readyPlayers
                }
            }
        })
    }, [])

    const handleStartRound = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            // TODO: strictly speaking the `round-ready` is the only valid status, but this needs more thought
            const validPrevStates: GameStatus[] = ['waiting-readiness', 'round-ready'];
            if (!validPrevStates.includes(prev.status)) {
                console.warn(`Received start round when the game state is ${prev.status}. Ignoring`)
                return prev
            }
            if (!prev.roundData) {
                console.warn("Invalid 'start-round' event received. Ignoring")
                return prev
            }

            return {
                ...prev,
                status: 'round-started',
                roundData: { ...prev.roundData, letter: ev.payload }
            }
        })
    }, [])

    const handleStopRound = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            let data = ev.payload as AnswersData;
            if (prev.currentRound !== data.round) {
                console.warn(`Received invalid round ${data.round} instead of ${prev.currentRound}. Ignoring event.`)
                return prev
            }
            if (!prev.roundData) return prev
            console.warn("RECEIVED stop ANSWERS FROM ", gameState.players.filter(p => p.id == data.submittedBy)[0].name)

            let stoppedBy = prev.roundData.stoppedBy
            let stoppedAt = prev.roundData.stoppedAt
            let answers = data.answers

            // If someone hasn't already stopped earlier then just update, else check if this is earlier than the existing
            if (!prev.roundData.stoppedBy) {
                stoppedBy = data.submittedBy
                stoppedAt = ev.timestamp
            } else if (prev.roundData.stoppedAt && prev.roundData.stoppedAt >= ev.timestamp) {
                stoppedBy = data.submittedBy
                stoppedAt = ev.timestamp
            }
            // update the answer if not already submitted by the submitter
            if (!!prev.roundData.answers[data.submittedBy]) {
                answers = prev.roundData.answers[data.submittedBy]
            }
            const newAnswers = { ...prev.roundData.answers, [data.submittedBy]: data.answers }
            const status = Object.keys(newAnswers).length === prev.players.length ? 'reviewing' : prev.status

            return {
                ...prev,
                roundData: {
                    ...prev.roundData,
                    status,
                    stoppedBy,
                    stoppedAt,
                    answers: { ...prev.roundData.answers, [data.submittedBy]: answers }
                }
            }
        })
    }, [gameState])

    const handleSubmitAnswers = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            let submitData = ev.payload as AnswersData;
            if (prev.currentRound !== submitData.round) {
                console.warn(`Received invalid round ${submitData.round} instead of ${prev.currentRound}. Ignoring event.`)
                return prev
            }
            if (!prev.roundData) return prev
            if (!!prev.roundData.answers[submitData.submittedBy]) {
                console.warn(`Received re-submitted answers by ${getPlayerName(submitData.submittedBy)}. Ignoring event.`)
                return prev
            }

            console.warn("RECEIVED ANSWERS FROM ", gameState.players.filter(p => p.id == submitData.submittedBy)[0].name)
            const newAnswers = { ...prev.roundData.answers, [submitData.submittedBy]: submitData.answers }
            const status = Object.keys(newAnswers).length === prev.players.length ? 'reviewing' : prev.status

            return {
                ...prev,
                status,
                roundData: { ...prev.roundData, answers: newAnswers }
            }
        })
    }, [gameState, getPlayerName])

    const handleSubmitReview = useCallback((ev: GameEvent) => {
        setGameState(prev => {
            const reviewData = ev.payload as ReviewData
            if (prev.currentRound !== reviewData.round) {
                console.warn(`Received invalid round ${reviewData.round} instead of ${prev.currentRound}. Ignoring event.`)
                return prev
            }
            if (!prev.roundData) return prev
            if (!!prev.roundData.reviews[reviewData.submittedBy]) {
                console.warn(`Received re-submitted review by player ${reviewData.submittedBy}. Ignoring event.`)
                return prev
            }

            const newReviews = { ...prev.roundData.reviews, [reviewData.submittedBy]: reviewData.answersReview }

            if (Object.keys(newReviews).length === prev.players.length) {
                const nextRound = prev.currentRound + 1
                const status = prev.currentRound >= prev.config.numRounds ? 'ended' : 'waiting-readiness'
                return {
                    ...prev,
                    status,
                    currentRound: nextRound,
                    allRounds: [...prev.allRounds, { ...prev.roundData, reviews: newReviews }],
                    roundData: {
                        turnPlayerIndex: (prev.roundData.turnPlayerIndex + 1) % prev.players.length,
                        roundNumber: nextRound,
                        answers: {},
                        reviews: {},
                        readyPlayers: new Set()
                    }
                }
            }

            return {
                ...prev,
                roundData: { ...prev.roundData, reviews: newReviews }
            }
        })
    }, [])

    const applyEvent = useCallback((ev: GameEvent) => {
        // Don't apply already applied event
        if (appliedEventIds.has(ev.id)) return

        switch (ev.type) {
            case 'init-game':
                handleInitGame(ev)
                break;
            case 'add-player':
                handleAddPlayer(ev)
                break;
            case 'set-waiting-peers':
                handleSetWaitingPeers()
                break;
            case 'wait-round-readiness':
                handleWaitReadiness(ev)
                break;
            case 'submit-round-readiness':
                handleSubmitRoundReadiness(ev)
                break;
            case 'start-round':
                handleStartRound(ev)
                break;
            case 'stop-round':
                handleStopRound(ev)
                break;
            case 'submit-answers':
                handleSubmitAnswers(ev)
                break;
            case 'submit-review':
                handleSubmitReview(ev)
                break;
        }

        setAppliedEventIds(prev => {
            let newevs = new Set(prev)
            newevs.add(ev.id)
            return newevs
        })
        setAppliedEvents(prev => [...prev, ev])
    }, [
        appliedEventIds,
        handleAddPlayer,
        handleSetWaitingPeers,
        handleWaitReadiness,
        handleStartRound,
        handleStopRound,
        handleSubmitAnswers,
        handleSubmitReview,
        handleSubmitRoundReadiness,
        handleInitGame,
    ])

    return {
        gameState,
        actions: useMemo(() => ({
            applyEvent,
            applyEvents: (evs: GameEvent[]) => evs.forEach(applyEvent)
        }), [applyEvent])
    }
}
