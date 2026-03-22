import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
    GameState,
    GameEvent,
    AnswersData,
    GameStatus,
    GameEventType,
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

// Events are retried in this order when buffered.
// Lower number = higher priority = tried first.
const EVENT_PRIORITY: Record<GameEventType, number> = {
    'send-message': 0,
    'remove-player': 0,
    'init-game': 1,
    'add-player': 2,
    'set-waiting-peers': 3,
    'wait-round-readiness': 4,
    'submit-round-readiness': 5,
    'start-round': 6,
    'submit-answers': 7,
    'stop-round': 7,
    'submit-review': 8,
}

// Drop pending events older than this to prevent unbounded growth
const PENDING_TTL_MS = 30_000

export interface GameActions {
    applyEvent: (ev: GameEvent) => void
    applyEvents: (evs: GameEvent[]) => void
}

export const useGameState = () => {
    // React state for rendering
    const [gameState, setGameState] = useState<GameState>(initialState)

    // Refs for synchronous access (avoids stale closures and side effects in state updaters)
    const gameStateRef = useRef<GameState>(initialState)
    const appliedEventIdsRef = useRef<Set<string>>(new Set())
    const appliedEventsRef = useRef<GameEvent[]>([])
    const pendingEventsRef = useRef<GameEvent[]>([])

    // Keep ref and state in sync for rendering
    const updateGameState = useCallback((newState: GameState) => {
        gameStateRef.current = newState
        setGameState(newState)
    }, [])

    useEffect(() => {
        const seen = new Set<string>();
        const dedupedPlayers = gameState.players.filter(player => {
            if (seen.has(player.id)) return false;
            seen.add(player.id);
            return true;
        });

        if (dedupedPlayers.length !== gameState.players.length) {
            const deduped = { ...gameState, players: dedupedPlayers }
            gameStateRef.current = deduped
            setGameState(deduped)
        }
    }, [gameState.players]);

    // Core event processor: merges incoming events with pending buffer,
    // sorts by game-flow priority, and applies in a loop until no more can drain.
    const processEvents = useCallback((incomingEvents: GameEvent[]) => {
        const appliedIds = appliedEventIdsRef.current
        let state = gameStateRef.current

        // Merge incoming with pending, dedup, sort by (type_priority, timestamp)
        const allEvents = [...pendingEventsRef.current, ...incomingEvents]
            .filter(ev => !appliedIds.has(ev.id))
            .sort((a, b) => {
                const pa = EVENT_PRIORITY[a.type] ?? 99
                const pb = EVENT_PRIORITY[b.type] ?? 99
                if (pa !== pb) return pa - pb
                return a.timestamp - b.timestamp
            })

        const newlyApplied: GameEvent[] = []
        let changed = true
        let candidates = allEvents

        // Keep looping until a full pass applies nothing
        while (changed) {
            changed = false
            const stillPending: GameEvent[] = []

            for (const ev of candidates) {
                if (appliedIds.has(ev.id)) continue
                const next = pureStateTransition(state, ev)
                if (next === null) {
                    // Guard rejected due to ordering — buffer for retry
                    stillPending.push(ev)
                } else {
                    state = next
                    appliedIds.add(ev.id)
                    newlyApplied.push(ev)
                    changed = true
                }
            }
            candidates = stillPending
        }

        // Drop expired pending events
        const now = Date.now()
        pendingEventsRef.current = candidates.filter(
            ev => now - ev.timestamp < PENDING_TTL_MS
        )

        if (pendingEventsRef.current.length > 0) {
            console.warn(`[GameState] ${pendingEventsRef.current.length} event(s) pending:`,
                pendingEventsRef.current.map(ev => ev.type))
        }

        // Update applied events list and trigger re-render
        if (newlyApplied.length > 0) {
            appliedEventsRef.current = [...appliedEventsRef.current, ...newlyApplied]
            updateGameState(state)
        }
    }, [updateGameState])

    // Compute vector clock from applied events
    const getEventVectorClock = useCallback((): Record<string, number> => {
        const vectorClock: Record<string, number> = {}

        appliedEventIdsRef.current.forEach(eventId => {
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
    }, [])

    return {
        gameState,
        appliedEvents: appliedEventsRef.current,
        actions: useMemo(() => ({
            applyEvent: (ev: GameEvent) => processEvents([ev]),
            applyEvents: (evs: GameEvent[]) => processEvents(evs),
            getEventVectorClock
        }), [processEvents, getEventVectorClock])
    }
}

// Returns the new state on success, or null if the event was rejected
// due to ordering (state not ready yet — should be buffered and retried).
// Returns prev (unchanged) for legitimate no-ops like duplicates or stale data.
export function pureStateTransition(prev: GameState, ev: GameEvent): GameState | null {
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

const handleInitGame = (prev: GameState, ev: GameEvent): GameState | null => {
    if (!['uninitialized', 'waiting-peers'].includes(prev.status)) {
        // State is not ready for init — buffer for retry
        return null
    }
    return {
        ...prev,
        status: 'waiting-peers',
        config: ev.payload
    } as GameState
};

const handleAddPlayer = (prev: GameState, ev: GameEvent): GameState | null => {
    if (!['waiting-peers', 'uninitialized'].includes(prev.status)) {
        // Game has moved past the join phase — buffer in case init-game hasn't arrived yet
        return null
    }
    // Player already exists — legitimate dedup, not an ordering issue
    if (prev.players.map(x => x.id).includes(ev.payload.id)) return prev

    let newplayers = [...prev.players, ev.payload]
    newplayers.sort((a, b) => a.joinedAt - b.joinedAt)
    return {
        ...prev,
        players: newplayers
    } as GameState
}

const handleRemovePlayer = (prev: GameState, ev: GameEvent): GameState | null => {
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

const handleSetWaitingPeers = (prev: GameState): GameState | null => {
    return { ...prev, status: 'waiting-peers' } as GameState
}

const handleWaitReadiness = (prev: GameState, ev: WaitRoundReadinessEvent): GameState | null => {
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

const handleSubmitRoundReadiness = (prev: GameState, ev: GameEvent): GameState | null => {
    let data = ev.payload as SubmitRoundReadinessData
    if (prev.status !== 'waiting-readiness') {
        // Not in readiness phase yet — buffer for retry
        return null
    }
    if (!prev.roundData) {
        // roundData not initialized yet — buffer for retry
        return null
    }
    let rd = prev.roundData
    let readyPlayers = new Set(rd.readyPlayers)
    readyPlayers.add(data.submittedBy)
    let st = prev.status as GameStatus
    if (readyPlayers.size == prev.players.length) {
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

const handleStartRound = (prev: GameState, ev: StartRoundEvent): GameState | null => {
    const validPrevStates: GameStatus[] = ['waiting-readiness', 'round-ready'];
    if (!validPrevStates.includes(prev.status)) {
        // Not in a state where round can start — buffer for retry
        return null
    }
    if (!prev.roundData) {
        // roundData not initialized yet — buffer for retry
        return null
    }

    return {
        ...prev,
        status: 'round-started',
        roundData: { ...prev.roundData, letter: ev.payload }
    } as GameState
}

const handleStopRound = (prev: GameState, ev: StopRoundEvent): GameState | null => {
    let data = ev.payload as AnswersData;
    // Wrong round — stale event, not an ordering issue
    if (prev.currentRound !== data.round) {
        return prev
    }
    if (!prev.roundData) {
        // roundData not initialized yet — buffer for retry
        return null
    }

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
    const newAnswers = { ...prev.roundData.answers, [data.submittedBy]: answers }
    const status = Object.keys(newAnswers).length === prev.players.length ? 'reviewing' : prev.status

    return {
        ...prev,
        status,  // FIX: status at top level, not inside roundData
        roundData: {
            ...prev.roundData,
            stoppedBy,
            stoppedAt,
            answers: newAnswers
        }
    } as GameState
}

const handleSubmitAnswers = (prev: GameState, ev: GameEvent): GameState | null => {
    let submitData = ev.payload as AnswersData;
    // Wrong round — stale event, not an ordering issue
    if (prev.currentRound !== submitData.round) {
        return prev
    }
    if (!prev.roundData) {
        // roundData not initialized yet — buffer for retry
        return null
    }
    // Already submitted — legitimate dedup
    if (!!prev.roundData.answers[submitData.submittedBy]) {
        return prev
    }

    const newAnswers = { ...prev.roundData.answers, [submitData.submittedBy]: submitData.answers }
    const status = Object.keys(newAnswers).length === prev.players.length ? 'reviewing' : prev.status

    return {
        ...prev,
        status,
        roundData: { ...prev.roundData, answers: newAnswers }
    }
}

const handleSubmitReview = (prev: GameState, ev: SubmitReviewEvent): GameState | null => {
    const reviewData = ev.payload as ReviewData
    // Wrong round — stale event, not an ordering issue
    if (prev.currentRound !== reviewData.round) {
        return prev
    }
    if (!prev.roundData) {
        // roundData not initialized yet — buffer for retry
        return null
    }
    // Already submitted — legitimate dedup
    if (!!prev.roundData.reviews[reviewData.submittedBy]) {
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

const handleSentMessage = (prev: GameState, ev: SendMessageEvent): GameState | null => {
    let msg = ev.payload as Message
    // Duplicate message — legitimate dedup
    if (prev.messages.map(m => m.id).includes(msg.id)) return prev
    return {
        ...prev,
        messages: [...prev.messages, msg]
    } as GameState
}
