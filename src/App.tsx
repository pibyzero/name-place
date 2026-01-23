import { useGameState } from './hooks/useGameState'
import { Home } from './components/screens/Home'
import { LetterSelection } from './components/screens/LetterSelection'
import { RoundPlay } from './components/screens/Round'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { useCallback, useEffect, } from 'react'
import { WaitingPeers } from './components/screens/WaitingPeers'
import { getSeedPeerFromURL } from './utils/p2p'
import { useP2P } from './hooks/useP2p'
import { DataConnection } from 'peerjs'
import { PlayerAnswers, AnswersData, AnswersReview, ReviewData } from './types/game'

function getRoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#room\/([^?]+)/);
    return match ? match[1] : undefined;
}

// Generate a game room name.
function generateRoomName() {
    const adjectives = ['happy', 'sunny', 'cosmic', 'wild', 'bright', 'swift', 'noble', 'misty'];
    const nouns = ['tiger', 'ocean', 'mountain', 'forest', 'river', 'storm', 'eagle'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const random = Math.random().toString(16).slice(2, 2 + 4);
    return `${adj}-${noun}-${random}`;
}

const RAND_LEN = 1; // 5

function App() {
    const { gameState, actions: game } = useGameState()
    const p2p = useP2P();

    useEffect(() => {
        let roomName = getRoomFromURL()
        if (roomName !== undefined) {
            p2p.setRoomName(roomName)
        }
    }, [])

    // Wait for peer game events
    useEffect(() => {
        if (p2p.peerEvents.length == 0) return
        console.warn("received peer events", p2p.peerEvents)
        game.applyEvents(p2p.peerEvents)
        // clear peer events, this moves events to all game events
        p2p.actions.clearPeerEvents()
    }, [p2p.peerEvents, game, gameState])

    // Wait for allGameEvents to change
    useEffect(() => {
        if (p2p.allGameEvents.length == 0) return
        console.warn("broadcasting events")
        p2p.actions.broadcastGameEvents()
    }, [p2p.allGameEvents])

    // Also set timer just in case
    useEffect(() => {
        if (p2p.allGameEvents.length === 0) return;

        const intervalId = setInterval(() => {
            p2p.actions.broadcastGameEvents();
        }, 1000);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [p2p.allGameEvents, p2p.actions]);

    const onInit = useCallback((name: string) => {
        if (p2p.isInitialized) return;
        let seedPeer = getSeedPeerFromURL();
        let roomName = p2p.state.roomName || generateRoomName();
        const id = `${roomName}-${Math.random().toString(16).slice(2, 2 + RAND_LEN)}`;
        p2p.initialize(roomName, id, name, seedPeer)
    }, [])

    // If p2p initializsed and is not a jost, do a join handshake
    useEffect(() => {
        if (p2p.status != 'initialized' || p2p.isHost) return;
        // Try create connection with host and join handshake
        p2p.createConnection(p2p.state.host, (conn: DataConnection) => {
            console.warn("trying send join handshake", p2p.state.player)
            conn.send({ type: 'join-handshake', data: p2p.state.player })
            console.warn("sent join handshake")
        })
    }, [p2p.status]);

    useEffect(() => {
        if (!p2p.isInitialized || gameState.status != 'uninitialized') return
        const evAddPlayer = p2p.create.addPlayerEvent(p2p.state.player)
        const evWaiting = p2p.create.setWaitingPeersEvent()
        const events = [evAddPlayer, evWaiting]
        game.applyEvents(events)
    }, [p2p.isInitialized])

    const onStartGame = useCallback(() => {
        let playerIndex = 0; // Game always starts with zero indexed player and everyone takes turn
        let ev = p2p.create.waitRoundReadinessEvent(playerIndex)
        game.applyEvents([ev])
    }, [p2p, game])

    const onSelectLetter = useCallback((letter: string) => {
        let ev = p2p.create.startRoundEvent(letter)
        console.warn("broadcasting start round event before applying to current state. game status:", gameState.status)
        p2p.actions.broadcastGameEvents();
        // maybe wait some sec just in case others are not synced
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
        p2p.actions.broadcastGameEvents()
    }, [p2p, game, gameState])

    const broadcastAnswers = useCallback((ans: PlayerAnswers) => {
        let data: AnswersData = {
            answers: ans,
            submittedBy: p2p.state.player.id,
            round: gameState.currentRound
        }
        let ev = p2p.create.submitAnswersEvent(data)
        game.applyEvent(ev)
        p2p.actions.broadcastGameEvents()
    }, [p2p, game, gameState])

    const onSubmitReview = useCallback((answersReview: AnswersReview) => {
        let data: ReviewData = {
            answersReview,
            submittedBy: p2p.state.player.id,
            round: gameState.currentRound,
        }
        let ev = p2p.create.submitReviewEvent(data)
        game.applyEvent(ev)
        p2p.actions.broadcastGameEvents()
    }, [p2p, game, gameState])

    return (
        <div className="min-h-screen bg-cream">
            {gameState.status === 'uninitialized' && p2p.state && (
                <Home onInit={onInit} roomName={p2p.state.roomName} />
            )}

            {gameState.status === 'waiting-peers' && p2p.state.player && (
                <WaitingPeers localState={p2p.state} gameState={gameState} onStartGame={onStartGame} />
            )}

            {gameState.status === 'waiting-readiness' && (
                <LetterSelection
                    localState={p2p.state}
                    onSelectLetter={onSelectLetter}
                    currentRound={gameState.currentRound}
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
                    players={gameState.players}
                    answers={gameState.roundData.answers}
                    validations={gameState.roundData.reviews}
                    categories={gameState.categories}
                    letter={gameState.roundData.letter}
                    currentRound={gameState.currentRound}
                    totalScores={gameState.scores}
                    onNextRound={game.nextRound}
                    onEndGame={game.endGame}
                />
            )}
        </div>
    )
}

export default App
