import { useGameState } from './hooks/useGameState'
import { Home } from './components/screens/Home'
import { PlayerSetup } from './components/screens/PlayerSetup'
import { LetterSelection } from './components/screens/LetterSelection'
import { MultiPlayerGamePlay } from './components/screens/MultiPlayerGamePlay'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { useCallback, useEffect, } from 'react'
import { useLocalState } from './hooks/useLocalState'
import { WaitingPeers } from './components/screens/WaitingPeers'
import { getSeedPeerFromURL } from './utils/p2p'
import { useP2P } from './hooks/useP2p'
import { DataConnection } from 'peerjs'

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
    const random = Math.random().toString(16).substr(2, 4);
    return `${adj}-${noun}-${random}`;
}

const RAND_LEN = 1; // 5

function App() {
    const { gameState, actions: game } = useGameState()
    const { localState, actions: localActions } = useLocalState()
    const p2p = useP2P();

    useEffect(() => {
        let roomName = getRoomFromURL()
        if (roomName !== undefined) {
            p2p.setRoomName(roomName)
        }
    })

    // Wait for peer game events
    useEffect(() => {
        if (p2p.peerEvents.length == 0) return
        game.applyEvents(p2p.peerEvents)
        // clear peer events, this moves events to all game events
        p2p.actions.clearPeerEvents()
    }, [p2p.peerEvents])

    // Wait for allGameEvents to change
    useEffect(() => {
        if (p2p.allGameEvents.length == 0) return
        console.warn("broadcasting events", p2p.allGameEvents)
        p2p.actions.broadcastGameEvents()
    }, [p2p.allGameEvents])

    // Also set timer just in case
    useEffect(() => {
        if (p2p.allGameEvents.length === 0) return;

        const intervalId = setInterval(() => {
            console.warn("broadcasting events from timer tick");
            p2p.actions.broadcastGameEvents();
        }, 5 * 1000);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [p2p.allGameEvents, p2p.actions]);

    const onInit = useCallback((name: string) => {
        if (p2p.isInitialized) return;
        let seedPeer = getSeedPeerFromURL();
        let roomName = p2p.state.roomName || generateRoomName();
        const id = `${roomName}-${Math.random().toString(16).substr(2, RAND_LEN)}`;
        p2p.initialize(roomName, id, name, seedPeer)
    }, [])

    useEffect(() => {
        if (p2p.status != 'initialized' || p2p.isHost) return;
        // Try create connection with host and join handshake
        p2p.createConnection(p2p.state.host, (conn: DataConnection) => {
            conn.send({ type: 'join-handshake', data: p2p.state.player })
        })
    }, [p2p.status]);

    useEffect(() => {
        if (!p2p.isInitialized || gameState.status != 'uninitialized') return
        const evAddPlayer = p2p.create.addPlayerEvent(p2p.state.player)
        const evWaiting = p2p.create.setWaitingEvent()
        const events = [evAddPlayer, evWaiting]
        game.applyEvents(events)
    }, [p2p.isInitialized])

    return (
        <div className="min-h-screen bg-cream">
            {gameState.status === 'uninitialized' && p2p.state && (
                <Home onInit={onInit} roomName={p2p.state.roomName} />
            )}

            {gameState.status === 'waiting-peers' && p2p.state.player && (
                <WaitingPeers localState={p2p.state} gameState={gameState} />
            )}


            {gameState.status === 'player-setup' && (
                <PlayerSetup onStartGame={handleGameStart} />
            )}

            {gameState.status === 'letter-selection' && (
                <LetterSelection
                    onSelectLetter={game.selectLetter}
                    currentRound={gameState.currentRound}
                    playerName={currentPlayer?.name || 'Player'}
                />
            )}

            {gameState.status === 'playing' && gameState.roundData && (
                <MultiPlayerGamePlay
                    letter={gameState.selectedLetter}
                    categories={gameState.categories}
                    players={gameState.players}
                    currentPlayerId={localState.player.id}
                    answers={gameState.roundData.answers}
                    timeRemaining={gameState.timeRemaining}
                    currentRound={gameState.currentRound}
                    mode={gameState.mode}
                    roundStopped={!!gameState.roundData.stoppedBy}
                    onSelectPlayer={game.setCurrentPlayer}
                    onUpdateAnswer={game.updateAnswer}
                    onStopRound={game.stopRound}
                    onSubmit={game.proceedToReview}
                />
            )}

            {gameState.status === 'review' && gameState.roundData && (
                <ReviewPhase
                    players={gameState.players}
                    currentPlayerId={localState.player.id}
                    answers={gameState.roundData.answers}
                    categories={gameState.categories}
                    letter={gameState.selectedLetter}
                    currentRound={gameState.currentRound}
                    reviewsSubmitted={gameState.reviewsSubmitted}
                    onSelectPlayer={game.setCurrentPlayer}
                    onSubmitReview={game.submitReview}
                />
            )}

            {gameState.status === 'results' && gameState.roundData && (
                <Leaderboard
                    players={gameState.players}
                    answers={gameState.roundData.answers}
                    validations={gameState.roundData.validations}
                    categories={gameState.categories}
                    letter={gameState.selectedLetter}
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
