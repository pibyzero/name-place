import { FC } from 'react'
import { Timer } from '../ui/Timer'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface GamePlayProps {
  letter: string
  categories: string[]
  answers: Record<string, string>
  timeRemaining: number
  currentRound: number
  onUpdateAnswer: (category: string, answer: string) => void
  onSubmit: () => void
}

export const GamePlay: FC<GamePlayProps> = ({
  letter,
  categories,
  answers,
  timeRemaining,
  currentRound,
  onUpdateAnswer,
  onSubmit
}) => {
  const allAnswersFilled = categories.every(cat => answers[cat]?.trim())

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center bg-white rounded-2xl shadow-xl p-6">
          <p className="text-lg text-gray-600 mb-2">Round {currentRound}</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold">Letter:</span>
              <span className="text-4xl font-bold text-coral ml-4">{letter}</span>
            </div>
            <Timer seconds={timeRemaining} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          <h3 className="text-xl font-bold mb-4">Fill in your answers:</h3>

          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-4">
              <label className="w-32 font-semibold">{category}:</label>
              <Input
                type="text"
                placeholder={`${category} starting with ${letter}`}
                value={answers[category] || ''}
                onChange={(e) => onUpdateAnswer(category, e.target.value)}
                className="flex-1"
              />
              {answers[category]?.trim() && (
                <span className="text-green-500">✓</span>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={onSubmit}
            disabled={!allAnswersFilled}
            size="large"
            variant="primary"
          >
            Submit Answers
          </Button>
          {!allAnswersFilled && (
            <p className="text-sm text-gray-500 mt-2">
              Fill all categories to submit
            </p>
          )}
        </div>
      </div>
    </div>
  )
}