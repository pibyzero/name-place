import { useState, useCallback, useEffect } from 'react'
import {
    GameState,
    Player,
    RoundData,
    GameEvent,
    AnswersData,
    GameStatus
} from '../types/game'
import { DEFAULT_CATEGORIES, TIMER_DURATION } from '../utils/constants'

const initialState: GameState = {
    status: 'uninitialized',
    mode: 'classic',
    players: [],
    currentRound: 1,
    selectedLetter: '',
    usedLetters: [],
    categories: DEFAULT_CATEGORIES,
    roundData: null,
    allRounds: [],
    timeRemaining: TIMER_DURATION,
    scores: new Map(),
    reviewsSubmitted: new Set()
}

export interface GameActions {
    applyEvent: (ev: GameEvent) => {}
    applyEvents: (evs: GameEvent[]) => {}
}

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState>(initialState)

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

    const applyEvent = useCallback((ev: GameEvent) => {
        switch (ev.type) {
            case 'add-player':
                // TODO: this might affect when some players get 'started' event
                // before a legit `add-player` event. BUT this should be handled by sorting the events.
                // However, that is still challenging because then we would have to replay events from the start possibly by clearing the game state.
                if (!['waiting-peers', 'uninitialized'].includes(gameState.status)) return
                addPlayer(ev.payload)
                break;
            case 'set-waiting-status':
                setGameState(prev => ({ ...prev, status: 'waiting-peers' }))
                break;
            case 'start-game':
                let startPlayerId = ev.payload
                // TODO: maybe this should be set in `start-round`?
                let roundData: RoundData = {
                    turnPlayerIndex: startPlayerId,
                    roundNumber: gameState.currentRound,
                    answers: {},
                    reviews: [],
                }
                setGameState(prev => ({ ...prev, status: 'started', roundData }))
                break;
            case 'start-round':
                const validPrevStates: GameStatus[] = ['started'];
                if (!validPrevStates.includes(gameState.status)) {
                    console.warn(`Received start round when the game state is ${gameState.status}. Ignoring`)
                    return
                }
                // TODO: check if the event is from turnPlayer
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
            case 'stop-round':
                let data = ev.payload as AnswersData;
                if (gameState.currentRound != data.round) {
                    console.warn(`Received invalid round ${data.round} instead of ${gameState.currentRound}. Ignoring event.`)
                    return
                }
                let rd = gameState.roundData as RoundData
                rd.stoppedBy = data.submittedBy
                rd.stoppedAt = ev.timestamp

                // Set answers by the submitter
                rd.answers[data.submittedBy] = data.answers

                setGameState(prev => ({
                    ...prev,
                    roundData: rd,
                }))
                break;
            case 'submit-answers':
                let submitData = ev.payload as AnswersData;
                if (gameState.currentRound != submitData.round) {
                    console.warn(`Received invalid round ${submitData.round} instead of ${gameState.currentRound}. Ignoring event.`)
                    return
                }
                let srd = gameState.roundData as RoundData

                // If already submitted, ignore. First write wins
                if (!!srd.answers[submitData.submittedBy]) {
                    console.warn(`Received re-submitted answers by player ${submitData.submittedBy}. Ignoring event.`)
                    return
                }

                // Set answers by the submitter
                srd.answers[submitData.submittedBy] = submitData.answers

                // Check if total answers is equal to the total players.
                // If so, set the game status to `reviewing`
                let status = gameState.status
                if (Object.keys(srd.answers).length == gameState.players.length) {
                    status = 'reviewing'
                }

                setGameState(prev => ({
                    ...prev,
                    roundData: srd,
                    status
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
            applyEvent,
            applyEvents
        } as GameActions
    }
}
