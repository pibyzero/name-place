import { GameActions, useGameState } from './hooks/useMultiPlayerGame'
// import { GameActions, useGameState } from './hooks/useYjsState'
import { Home } from './components/screens/Home'
import { PlayerSetup } from './components/screens/PlayerSetup'
import { LetterSelection } from './components/screens/LetterSelection'
import { MultiPlayerGamePlay } from './components/screens/MultiPlayerGamePlay'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'
import { useCallback, useEffect, useState, } from 'react'
import { useLocalState } from './hooks/useLocalState'
import { Player, GameMode, } from './types/game'
import { WaitingPeers } from './components/screens/WaitingPeers'
import { getSeedPeerFromURL, PeerInitializer } from './utils/peer'

function getRoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#room\/([^?]+)/);
    return match ? match[1] : null;
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
    const [roomName, setRoomName] = useState(() => generateRoomName())
    const [uniqueId] = useState(() => Math.random().toString(16).substr(2, 5));
    const { gameState, actions } = useGameState()
    const { localState, actions: localActions } = useLocalState()

    useEffect(() => {
        // Check for presence of peer id and roomname in the url
        let roomName = getRoomFromURL()
        if (roomName !== null) {
            setRoomName(roomName)
            localActions.setRoomName(roomName)
        }
    }, [])

    const handleGameInit = useCallback((playerName: string) => {
        let peerId = `${roomName}-${uniqueId}`;
        let seedPeer: string | null = getSeedPeerFromURL();

        // Set room if empty
        if (localState.roomName === '') {
            localActions.setRoomName(roomName)
        }

        let host: Player = {
            id: peerId,
            name: playerName,
        };
        localActions.setPlayer(host)

        // initialize peer, this can be better
        let initPeer = (new PeerInitializer())
            .withName(playerName)
            .withId(peerId)
            .withPlayerSetter(localActions.setPlayer)
            .withGameActions(actions);

        initPeer.initialize(gameState, seedPeer, localState.peers)

    }, [localState, gameState]);

    const handleGameStart = (players: any[], mode: 'classic' | 'timer') => {
        actions.startGame(players, mode)
        actions.proceedFromSetup()
    }

    const currentPlayer = localState.player

    return (
        <div className="min-h-screen bg-cream">
            {gameState.status === 'uninitialized' && (
                <Home onInit={handleGameInit} localState={localState} />
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

