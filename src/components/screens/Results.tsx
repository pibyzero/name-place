import { FC } from 'react'
import { Button } from '../ui/Button'

interface ResultsProps {
  letter: string
  answers: Record<string, string>
  roundScore: number
  totalScore: number
  currentRound: number
  onNextRound: () => void
  onNewGame: () => void
}

export const Results: FC<ResultsProps> = ({
  letter,
  answers,
  roundScore,
  totalScore,
  currentRound,
  onNextRound,
  onNewGame
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Round {currentRound} Results</h2>
          <p className="text-lg text-gray-600">Letter: {letter}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold mb-4">Your Answers:</h3>
          <div className="space-y-2 mb-6">
            {Object.entries(answers).map(([category, answer]) => (
              <div key={category} className="flex justify-between py-2 border-b">
                <span className="font-semibold">{category}:</span>
                <span className={answer.trim() ? 'text-charcoal' : 'text-gray-400'}>
                  {answer.trim() || '(empty)'}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-cream rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Round Score:</span>
              <span className="font-bold text-coral">{roundScore} points</span>
            </div>
            <div className="flex justify-between text-xl">
              <span className="font-semibold">Total Score:</span>
              <span className="font-bold text-teal">{totalScore} points</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 justify-center">
          <Button onClick={onNextRound} size="large">
            Next Round
          </Button>
          <Button onClick={onNewGame} size="large" variant="secondary">
            New Game
          </Button>
        </div>
      </div>
    </div>
  )
}