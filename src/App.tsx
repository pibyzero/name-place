import { GameActions, useGameState } from './hooks/useGameState'
import { Home } from './components/screens/Home'
import { PlayerSetup } from './components/screens/PlayerSetup'
import { LetterSelection } from './components/screens/LetterSelection'
import { MultiPlayerGamePlay } from './components/screens/MultiPlayerGamePlay'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { useCallback, useEffect, useState, } from 'react'
import { useLocalState } from './hooks/useLocalState'
import { Player } from './types/game'
import { WaitingPeers } from './components/screens/WaitingPeers'
import { getSeedPeerFromURL, PeerInitializer } from './utils/peer'
import { useP2P } from './hooks/useP2p'

function getRoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#room\/([^?]+)/);
    return match ? match[1] : undefined;
}

function startGame(playerName: string, roomName: string, actions: GameActions) {
    throw new Error('Function not implemented.')
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

function App() {
    const { initialize, isInitialized } = useP2P();
    const [roomName, setRoomName] = useState<string | undefined>();
    const { gameState, actions } = useGameState()
    const { localState, actions: localActions } = useLocalState()

    useEffect(() => {
        let room = getRoomFromURL();
        setRoomName(room);
    }, [])

    const onInit = useCallback((name: string) => {
        if (isInitialized) return;
        let seedPeer = getSeedPeerFromURL();
        const id = Math.random().toString(16).substr(2, 5);
        initialize(id, name, seedPeer)
    }, [isInitialized])

    const meLoaded = localState.player.id.length > 0;

    return (
        <div className="min-h-screen bg-cream">
            {gameState.status === 'uninitialized' && (
                <Home onInit={onInit} roomName={roomName} />
            )}

            {gameState.status === 'waiting-peers' && (
                <WaitingPeers localState={localState} gameState={gameState} />
            )}


            {gameState.status === 'player-setup' && (
                <PlayerSetup onStartGame={handleGameStart} />
            )}

            {gameState.status === 'letter-selection' && (
                <LetterSelection
                    onSelectLetter={actions.selectLetter}
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
                    onSelectPlayer={actions.setCurrentPlayer}
                    onUpdateAnswer={actions.updateAnswer}
                    onStopRound={actions.stopRound}
                    onSubmit={actions.proceedToReview}
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
                    onSelectPlayer={actions.setCurrentPlayer}
                    onSubmitReview={actions.submitReview}
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
                    onNextRound={actions.nextRound}
                    onEndGame={actions.endGame}
                />
            )}
        </div>
    )
}

export default App
