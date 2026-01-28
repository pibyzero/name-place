import { useState, useCallback, useEffect, useMemo } from 'react'
import {
    GameState,
    GameEvent,
    AnswersData,
    GameStatus,
    ReviewData,
    SubmitRoundReadinessData,
    WaitRoundReadinessEvent,
    StartRoundEvent,
    StopRoundEvent,
    SubmitReviewEvent,
    SendMessageEvent,
    Message,
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
    messages: []
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


    const applyEvent = useCallback((ev: GameEvent) => {
        // Don't apply already applied event
        if (appliedEventIds.has(ev.id)) return

        setGameState(prev => pureStateTransition(prev, ev))

        setAppliedEventIds(prev => {
            let newevs = new Set(prev)
            newevs.add(ev.id)
            return newevs
        })
        setAppliedEvents(prev => [...prev, ev])
    }, [appliedEventIds])

    // Compute vector clock from applied events
    const getEventVectorClock = useCallback((): Record<string, number> => {
        const vectorClock: Record<string, number> = {}

        appliedEventIds.forEach(eventId => {
            // Event ID format: "{peerId}-{sequenceNumber}"
            const parts = eventId.split('-')
            if (parts.length >= 2) {
                const sequenceStr = parts[parts.length - 1]
                const peerId = parts.slice(0, -1).join('-') // Handle peer IDs with dashes
                const sequence = parseInt(sequenceStr, 10)

                if (!isNaN(sequence)) {
                    vectorClock[peerId] = Math.max(vectorClock[peerId] || -1, sequence)
                }
            }
        })

        return vectorClock
    }, [appliedEventIds])

    return {
        gameState,
        appliedEvents: _appliedEvents,
        actions: useMemo(() => ({
            applyEvent,
            applyEvents: (evs: GameEvent[]) => evs.forEach(applyEvent),
            getEventVectorClock
        }), [applyEvent, getEventVectorClock])
    }
}

export function pureStateTransition(prev: GameState, ev: GameEvent): GameState {
    switch (ev.type) {
        case 'init-game':
            return handleInitGame(prev, ev)
        case 'add-player':
            return handleAddPlayer(prev, ev)
        case 'remove-player':
            return handleRemovePlayer(prev, ev)
        case 'set-waiting-peers':
            return handleSetWaitingPeers(prev)
        case 'wait-round-readiness':
            return handleWaitReadiness(prev, ev as WaitRoundReadinessEvent)
        case 'submit-round-readiness':
            return handleSubmitRoundReadiness(prev, ev)
        case 'start-round':
            return handleStartRound(prev, ev as StartRoundEvent)
        case 'stop-round':
            return handleStopRound(prev, ev as StopRoundEvent)
        case 'submit-answers':
            return handleSubmitAnswers(prev, ev)
        case 'submit-review':
            return handleSubmitReview(prev, ev as SubmitReviewEvent)
        case 'send-message':
            return handleSentMessage(prev, ev as SendMessageEvent)
        default:
            return prev
    }
}

const handleInitGame = (prev: GameState, ev: GameEvent) => {
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
    } as GameState
};

const handleAddPlayer = (prev: GameState, ev: GameEvent) => {
    if (!['waiting-peers', 'uninitialized'].includes(prev.status)) return prev
    if (prev.players.map(x => x.id).includes(ev.payload.id)) return prev

    let newplayers = [...prev.players, ev.payload]
    newplayers.sort((a, b) => a.joinedAt - b.joinedAt)
    return {
        ...prev,
        players: newplayers
    } as GameState
}

const handleRemovePlayer = (prev: GameState, ev: GameEvent) => {
    let newplayers = prev.players.filter(p => p.id != ev.payload)

    // If no players changed, return early
    if (newplayers.length === prev.players.length) return prev

    let newState = { ...prev, players: newplayers }

    // Recalculate thresholds based on new player count
    if (prev.roundData && newplayers.length > 0) {
        const readyCount = prev.roundData.readyPlayers?.size || 0
        const answersCount = Object.keys(prev.roundData.answers).length
        const reviewsCount = Object.keys(prev.roundData.reviews).length

        // Check if we now meet threshold for waiting-readiness -> round-ready
        if (prev.status === 'waiting-readiness' && readyCount >= newplayers.length) {
            newState.status = 'round-ready'
        }

        // Check if we now meet threshold for round-started/stopped -> reviewing
        if ((prev.status === 'round-started') && answersCount >= newplayers.length) {
            newState.status = 'reviewing'
        }

        // Check if we now meet threshold for reviewing -> next round/ended
        if (prev.status === 'reviewing' && reviewsCount >= newplayers.length) {
            const nextRound = prev.currentRound + 1
            const isGameOver = prev.currentRound >= prev.config.numRounds

            newState = {
                ...newState,
                status: isGameOver ? 'ended' : 'waiting-readiness',
                currentRound: nextRound,
                allRounds: [...prev.allRounds, { ...prev.roundData, reviews: prev.roundData.reviews }],
                roundData: isGameOver ? prev.roundData : {
                    turnPlayerIndex: (prev.roundData.turnPlayerIndex + 1) % newplayers.length,
                    roundNumber: nextRound,
                    answers: {},
                    reviews: {},
                    readyPlayers: new Set()
                }
            }
        }
    }

    return newState
}

const handleSetWaitingPeers = (prev: GameState) => {
    return { ...prev, status: 'waiting-peers' } as GameState
}

const handleWaitReadiness = (prev: GameState, ev: WaitRoundReadinessEvent) => {
    return {
        ...prev,
        status: 'waiting-readiness',
        roundData: {
            turnPlayerIndex: ev.payload,
            roundNumber: prev.currentRound,
            answers: {},
            reviews: {},
            readyPlayers: new Set()
        }
    } as GameState
}

const handleSubmitRoundReadiness = (prev: GameState, ev: GameEvent) => {
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
}

const handleStartRound = (prev: GameState, ev: StartRoundEvent) => {
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
    } as GameState
}

const handleStopRound = (prev: GameState, ev: StopRoundEvent) => {
    let data = ev.payload as AnswersData;
    if (prev.currentRound !== data.round) {
        console.warn(`Received invalid round ${data.round} instead of ${prev.currentRound}. Ignoring event.`)
        return prev
    }
    if (!prev.roundData) return prev
    console.warn("RECEIVED stop ANSWERS FROM ", prev.players.filter(p => p.id == data.submittedBy)[0].name)

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
    } as GameState
}

const handleSubmitAnswers = (prev: GameState, ev: GameEvent) => {
    let submitData = ev.payload as AnswersData;
    if (prev.currentRound !== submitData.round) {
        console.warn(`Received invalid round ${submitData.round} instead of ${prev.currentRound}. Ignoring event.`)
        return prev
    }
    if (!prev.roundData) return prev
    if (!!prev.roundData.answers[submitData.submittedBy]) {
        console.warn(`Received re-submitted answers by ${getPlayerName(submitData.submittedBy, prev)}. Ignoring event.`)
        return prev
    }

    console.warn("RECEIVED ANSWERS FROM ", prev.players.filter(p => p.id == submitData.submittedBy)[0].name)
    const newAnswers = { ...prev.roundData.answers, [submitData.submittedBy]: submitData.answers }
    const status = Object.keys(newAnswers).length === prev.players.length ? 'reviewing' : prev.status

    return {
        ...prev,
        status,
        roundData: { ...prev.roundData, answers: newAnswers }
    }
}

const handleSubmitReview = (prev: GameState, ev: SubmitReviewEvent) => {
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
        } as GameState
    }

    return {
        ...prev,
        roundData: { ...prev.roundData, reviews: newReviews }
    } as GameState
}

const handleSentMessage = (prev: GameState, ev: SendMessageEvent) => {
    let msg = ev.payload as Message
    if (prev.messages.map(m => m.id).includes(msg.id)) return prev
    return {
        ...prev,
        messages: [...prev.messages, msg]
    } as GameState
}

const getPlayerName = (pid: string, prev: GameState) => {
    return prev.players.filter(p => p.id == pid)[0]?.name
}

