import { GameActions, useGameState } from './hooks/useMultiPlayerGame'
import { Home } from './components/screens/Home'
import { PlayerSetup } from './components/screens/PlayerSetup'
import { LetterSelection } from './components/screens/LetterSelection'
import { MultiPlayerGamePlay } from './components/screens/MultiPlayerGamePlay'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { useEffect, } from 'react'
import { useLocalState } from './hooks/useLocalState'
import { GameScreen, Player, GameMode, ValidationVote } from './types/game'
import { getSeedPeerFromURL, initializePeer } from './peer'
import { WaitingPeers } from './components/screens/WaitingPeers'

function getRoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#room\/([^?]+)/);
    return match ? match[1] : null;
}

function startGame(playerName: string, roomName: string, actions: GameActions) {
    throw new Error('Function not implemented.')
}

function App() {
    const { gameState, actions } = useGameState()
    const { localState, actions: localActions } = useLocalState()

    useEffect(() => {
        // Check for presence of peer id and roomname in the url
        let roomName = getRoomFromURL()
        if (roomName !== null) {
            localActions.setRoomName(roomName)
            // Now try to get peer id, if no peer id then pretty much doomed, nothing to do
            let seedpeer = getSeedPeerFromURL()
            if (seedpeer == null) {
                alert!("No seed peer connected. Nothing to do.") // TODO: better error flow/display
                return;
            }
            localActions.addPeer(seedpeer)
        }
    }, [])

    const handleGameInit = (playerName: string, roomName: string) => {
        const uniqueId = Math.random().toString(16).substr(2, 5);
        let peerId = `${roomName}-${uniqueId}`;
        let host: Player = {
            id: peerId,
            name: playerName,
        };
        const mode: GameMode = 'classic'; // TODO: get from config

        // Initialize peer
        // initializePeer(peerId, null, localState.peers);

        localActions.setRoomName(roomName)
        localActions.setPlayerId(peerId)
        actions.initGame(host, mode);
    }

    const handleGameStart = (players: any[], mode: 'classic' | 'timer') => {
        actions.startGame(players, mode)
        actions.proceedFromSetup()
    }

    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId)

    return (
        <div className="min-h-screen bg-cream">
            {gameState.status === 'uninitialized' && (
                <Home onInit={handleGameInit} />
            )}

            {gameState.status === 'waiting-peers' && (
                <WaitingPeers localState={localState} />
            )}


            {gameState.screen === 'player-setup' && (
                <PlayerSetup onStartGame={handleGameStart} />
            )}

            {gameState.screen === 'letter-selection' && (
                <LetterSelection
                    onSelectLetter={actions.selectLetter}
                    currentRound={gameState.currentRound}
                    playerName={currentPlayer?.name || 'Player'}
                />
            )}

            {gameState.screen === 'playing' && gameState.roundData && (
                <MultiPlayerGamePlay
                    letter={gameState.selectedLetter}
                    categories={gameState.categories}
                    players={gameState.players}
                    currentPlayerId={gameState.currentPlayerId}
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

            {gameState.screen === 'review' && gameState.roundData && (
                <ReviewPhase
                    players={gameState.players}
                    currentPlayerId={gameState.currentPlayerId}
                    answers={gameState.roundData.answers}
                    categories={gameState.categories}
                    letter={gameState.selectedLetter}
                    currentRound={gameState.currentRound}
                    reviewsSubmitted={gameState.reviewsSubmitted}
                    onSelectPlayer={actions.setCurrentPlayer}
                    onSubmitReview={actions.submitReview}
                />
            )}

            {gameState.screen === 'results' && gameState.roundData && (
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

