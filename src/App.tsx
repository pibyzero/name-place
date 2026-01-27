import { useGameState } from './hooks/useGameState'
import { Home } from './components/screens/Home'
import { LetterSelection } from './components/screens/LetterSelection'
import { RoundPlay } from './components/screens/Round'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { CheckReadiness } from './components/screens/CheckReadiness'
import { useCallback, useEffect, useState, } from 'react'
import { WaitingPeers } from './components/screens/WaitingPeers'
import { GameStatusBar } from './components/ui/GameStatusBar'
import { ChatUI } from './components/ui/ChatUI'
import { generateRoomName, getRoomFromURL, getSeedPeerFromURL, roomNameFromSeedPeer } from './utils/p2p'
import { useP2P } from './hooks/useP2p'
import { DataConnection } from 'peerjs'
import { PlayerAnswers, AnswersData, AnswersReview, ReviewData, SubmitRoundReadinessData, GameConfig } from './types/game'
import { GameEventMessage, JoinHandshakeMessage, PeerListMessage } from './types/p2p'

const SUFFIX_LEN = 6

function App() {
    const { gameState, actions: game } = useGameState()
    const p2p = useP2P();
    const [config, setConfig] = useState<GameConfig>();

    useEffect(() => {
        let roomName = getRoomFromURL()
        if (roomName !== undefined) {
            p2p.setRoomName(roomName)
        }
    }, [])

    // Wait for any p2p messages that might trigger game state change, and any game states that might need to be relayed
    useEffect(() => {
        if (p2p.p2pMessages.length === 0) return
        p2p.p2pMessages.forEach(([m, from]) => {
            switch (m.type) {
                case 'join-handshake':
                    if (p2p.state.player.isHost) {
                        const player = (m as JoinHandshakeMessage).data
                        const ev = p2p.create.addPlayerEvent(player)
                        game.applyEvent(ev)
                        const onConn = (conn: DataConnection) => {
                            p2p.actions.broadcastGameEvents()
                            conn.send({ type: 'peer-list', data: Object.keys(p2p.peersRef.current || {}) })
                        }
                        const onClose = (pid: string) => {
                            const ev = p2p.create.removePlayerEvent(pid)
                            game.applyEvent(ev)
                            p2p.actions.broadcastGameEvents()
                        }
                        p2p.createConnection(player.id, onConn, onClose)
                    }
                    break;
                case 'peer-list':
                    const newPeers = (m as PeerListMessage).data.filter(p => !p2p.peersRef.current[p] && p !== p2p.state.player.id)
                    newPeers.forEach(p => p2p.createConnection(p, () => { }))
                    break;
                case 'game-events':
                    const evs = (m as GameEventMessage).data
                    let filtered = evs.filter(ev => !p2p.isAlreadyReceivedEventFrom(ev, from))
                    if (filtered.length == 0) return

                    game.applyEvents(filtered)
                    p2p.actions.relayGameEvents(evs)

                    p2p.actions.setReceivedEventsFrom(filtered, from)
                    break
                default:
                    break;
            }
        })
        p2p.actions.clearP2pMessages()

    }, [p2p.p2pMessages, game, p2p.actions, p2p.isAlreadyReceivedEventFrom, p2p.state.player, p2p.create, p2p.createConnection, p2p.peersRef])

    // Set timer to periodically broadcast unsynced msgs
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (p2p.myGameEvents.length == 0) return
            p2p.actions.broadcastGameEvents();
        }, 1000);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [p2p.myGameEvents, p2p.actions]);

    const onInit = useCallback((name: string, config: GameConfig) => {
        if (p2p.isInitialized) return;
        let seedPeer = getSeedPeerFromURL();
        let roomName = p2p.state.roomName || roomNameFromSeedPeer(seedPeer) || generateRoomName();
        // If no seed peer provided, this is the host - use room name as peer ID
        // Otherwise, add a suffix for uniqueness when joining
        const id = seedPeer ? `${roomName}-${Math.random().toString(10).slice(2, 2 + SUFFIX_LEN)}` : roomName;
        p2p.initialize(roomName, id, name, seedPeer)
        setConfig(config)
    }, [p2p])

    // If p2p initializsed and is not a jost, do a join handshake
    useEffect(() => {
        if (p2p.status != 'initialized' || p2p.isHost) return;
        // Try create connection with host and join handshake
        p2p.createConnection(p2p.state.host, (conn: DataConnection) => {
            conn.send({ type: 'join-handshake', data: p2p.state.player })
        })
    }, [p2p.status, p2p.state]);

    useEffect(() => {
        if (!p2p.isInitialized || gameState.status != 'uninitialized') return
        if (!config) {
            console.warn("No game config found. Not initializing")
            return
        }

        // if host, init game
        if (p2p.state.player.isHost) {
            const evInitGame = p2p.create.initGameEvent(config)
            const evAddPlayer = p2p.create.addPlayerEvent(p2p.state.player)
            const events = [evInitGame, evAddPlayer]
            game.applyEvents(events)
            // No need to broadcast here as there are no joined players yet
        }
    }, [p2p.isInitialized, config])

    const onStartGame = useCallback(() => {
        let playerIndex = 0; // Game always starts with zero indexed player and everyone takes turn
        let ev = p2p.create.waitRoundReadinessEvent(playerIndex)
        p2p.actions.broadcastGameEvents([ev])
        game.applyEvents([ev])
    }, [p2p, game])

    const onReadyForRound = useCallback(() => {
        let data: SubmitRoundReadinessData = {
            ready: true,
            submittedBy: p2p.state.player.id
        }
        let ev = p2p.create.submitRoundReadinessEvent(data)
        p2p.actions.broadcastGameEvents([ev])
        game.applyEvent(ev)
    }, [p2p, game])

    const onSelectLetter = useCallback((letter: string) => {
        let ev = p2p.create.startRoundEvent(letter)
        console.warn("broadcasting start round event before applying to current state. game status:", gameState.status)
        p2p.actions.broadcastGameEvents([ev]);
        game.applyEvents([ev])
    }, [p2p, game, gameState])

    const onStopRound = useCallback((ans: PlayerAnswers) => {
        let data: AnswersData = {
            answers: ans,
            submittedBy: p2p.state.player.id,
            round: gameState.currentRound
        }
        let ev = p2p.create.stopRoundEvent(data)
        game.applyEvent(ev)
        p2p.actions.broadcastGameEvents([ev])
    }, [p2p, game, gameState])

    const broadcastAnswers = useCallback((ans: PlayerAnswers) => {
        console.warn("broadcasting answers by", p2p.state.player.name)
        let data: AnswersData = {
            answers: ans,
            submittedBy: p2p.state.player.id,
            round: gameState.currentRound
        }
        let ev = p2p.create.submitAnswersEvent(data)
        game.applyEvent(ev)
        p2p.actions.broadcastGameEvents([ev])
    }, [p2p, game, gameState])

    const onSubmitReview = useCallback((answersReview: AnswersReview) => {
        let data: ReviewData = {
            answersReview,
            submittedBy: p2p.state.player.id,
            round: gameState.currentRound,
        }
        let ev = p2p.create.submitReviewEvent(data)
        game.applyEvent(ev)
        p2p.actions.broadcastGameEvents([ev])
    }, [p2p, game, gameState])

    const onSendMessage = useCallback((message: string) => {
        if (p2p.state?.player) {
            const ev = p2p.create.sendMessageEvent(message)
            game.applyEvent(ev)
            p2p.actions.broadcastGameEvents([ev])
        }
    }, [p2p.state, p2p.create.sendMessageEvent, game, p2p.actions])

    return (
        <div className="min-h-screen bg-cream">
            <GameStatusBar gameState={gameState} localState={p2p.state} />

            {gameState.status === 'uninitialized' && p2p.state && (
                <Home onInit={onInit} roomName={p2p.state.roomName} />
            )}

            {gameState.status === 'waiting-peers' && p2p.state.player && (
                <WaitingPeers localState={p2p.state} gameState={gameState} onStartGame={onStartGame} />
            )}

            {gameState.status === 'waiting-readiness' &&
                <CheckReadiness localState={p2p.state} gameState={gameState} onReady={onReadyForRound} />
            }

            {gameState.status === 'round-ready' && (
                <LetterSelection
                    localState={p2p.state}
                    onSelectLetter={onSelectLetter}
                    gameState={gameState}
                />
            )}

            {gameState.status === 'round-started' && gameState.roundData && (
                <RoundPlay
                    gameState={gameState}
                    onClickStopRound={onStopRound}
                    broadcastAnswers={broadcastAnswers}
                />
            )}

            {gameState.status === 'reviewing' && gameState.roundData && (
                <ReviewPhase
                    localState={p2p.state}
                    gameState={gameState}
                    onSubmitReview={onSubmitReview}
                />
            )}

            {gameState.status === 'ended' && gameState.roundData && (
                <Leaderboard
                    localState={p2p.state}
                    gameState={gameState}
                />
            )}

            {/* Chat UI - shows when game is initialized and player exists */}
            {p2p.state?.player && gameState.status !== 'uninitialized' && (
                <ChatUI
                    gameState={gameState}
                    messages={gameState.messages}
                    currentPlayerId={p2p.state.player.id}
                    onSendMessage={onSendMessage}
                />
            )}
        </div>
    )
}

export default App
