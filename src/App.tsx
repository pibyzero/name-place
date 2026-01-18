import { useGameState } from './hooks/useGameState'
import { Home } from './components/screens/Home'
import { LetterSelection } from './components/screens/LetterSelection'
import { GamePlay } from './components/screens/GamePlay'
import { Results } from './components/screens/Results'

function App() {
  const { gameState, actions } = useGameState()

  const handleStart = (playerName: string) => {
    actions.setPlayerName(playerName)
    actions.setScreen('letter-selection')
  }

  return (
    <div className="min-h-screen bg-cream">
      {gameState.screen === 'home' && (
        <Home onStart={handleStart} />
      )}

      {gameState.screen === 'letter-selection' && (
        <LetterSelection
          onSelectLetter={actions.selectLetter}
          currentRound={gameState.currentRound}
          playerName={gameState.playerName}
        />
      )}

      {gameState.screen === 'playing' && (
        <GamePlay
          letter={gameState.selectedLetter}
          categories={gameState.categories}
          answers={gameState.answers}
          timeRemaining={gameState.timeRemaining}
          currentRound={gameState.currentRound}
          onUpdateAnswer={actions.updateAnswer}
          onSubmit={actions.submitRound}
        />
      )}

      {gameState.screen === 'results' && (
        <Results
          letter={gameState.selectedLetter}
          answers={gameState.answers}
          roundScore={gameState.roundScores[gameState.roundScores.length - 1] || 0}
          totalScore={gameState.totalScore}
          currentRound={gameState.currentRound}
          onNextRound={actions.nextRound}
          onNewGame={actions.resetGame}
        />
      )}
    </div>
  )
}

export default App