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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Round {currentRound}</p>
          <h2 className="text-3xl font-bold">
            {playerName}, choose a letter
          </h2>
        </div>

        <div className="grid grid-cols-6 md:grid-cols-7 gap-3 p-6 bg-white bg-opacity-40 rounded-xl">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => onSelectLetter(letter)}
              className="aspect-square flex items-center justify-center text-2xl font-bold bg-white bg-opacity-60 hover:bg-coral hover:text-white rounded-lg transition-all duration-200 hover:scale-110 border border-gray-200"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}