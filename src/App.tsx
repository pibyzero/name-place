import { useState } from 'react'
import { useMultiPlayerGame } from './hooks/useMultiPlayerGame'
import { Home } from './components/screens/Home'
import { PlayerSetup } from './components/screens/PlayerSetup'
import { LetterSelection } from './components/screens/LetterSelection'
import { MultiPlayerGamePlay } from './components/screens/MultiPlayerGamePlay'
import { ReviewPhase } from './components/screens/ReviewPhase'
import { Leaderboard } from './components/screens/Leaderboard'

function App() {
    const { gameState, actions } = useMultiPlayerGame()
    const [isSinglePlayer, setIsSinglePlayer] = useState(false)

    const handleHomeStart = (playerName: string) => {
        // For now, go to player setup for multiplayer
        actions.setScreen('player-setup')
    }

    const handleGameStart = (players: any[], mode: 'classic' | 'timer') => {
        actions.startGame(players, mode)
        actions.proceedFromSetup()
    }

    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId)

    return (
        <div className="min-h-screen bg-cream">
            {gameState.screen === 'home' && (
                <Home onStart={handleHomeStart} />
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