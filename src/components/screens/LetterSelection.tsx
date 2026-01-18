import { FC } from 'react'
import { ALPHABET } from '../../utils/constants'

interface LetterSelectionProps {
  onSelectLetter: (letter: string) => void
  currentRound: number
  playerName: string
}

export const LetterSelection: FC<LetterSelectionProps> = ({
  onSelectLetter,
  currentRound,
  playerName
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-2">Round {currentRound}</p>
          <h2 className="text-3xl font-bold mb-8">
            {playerName}, choose a letter:
          </h2>
        </div>

        <div className="grid grid-cols-6 md:grid-cols-7 gap-4 bg-white rounded-2xl shadow-xl p-8">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => onSelectLetter(letter)}
              className="aspect-square flex items-center justify-center text-2xl font-bold bg-cream hover:bg-coral hover:text-white rounded-lg transition-all duration-200 hover:scale-110 shadow-md"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}