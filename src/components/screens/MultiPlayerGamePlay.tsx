import { FC, useCallback, useMemo, useState } from 'react'
import { Timer } from '../ui/Timer'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { GameState } from '../../types/game'

interface MultiPlayerGamePlayProps {
    letter: string | undefined
    gameState: GameState
    onStopRound: () => void
}

export const MultiPlayerGamePlay: FC<MultiPlayerGamePlayProps> = ({
    letter,
    gameState,
    onStopRound,
}) => {
    const [myAnswers, setMyAnswers] = useState<Record<string, string>>({})

    // Check if any player has stopped the round (for display)
    const someoneStoppedRound = false // TODO: get correct value
    const timeRemaining = 0;  // TODO: get correct value when relevant
    const mode: string = 'classic'

    const setAnswerForCategory = useCallback((cat: string, ans: string) => {
        setMyAnswers(prev => ({ ...prev, [cat]: ans }))
    }, [myAnswers])

    const allAnswersFilled = useMemo(() => {
        // Check if all cagtegories are filled
        return !gameState.categories.map(c => !!myAnswers[c]).some(x => !x)
    }, [myAnswers])
    const onSubmit = () => { }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Round Info Header */}
                <div className="text-center">
                    <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Round {gameState.currentRound}</p>
                    <div className="flex items-center justify-center gap-8 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-medium">Letter:</span>
                            <span className="text-4xl font-bold text-coral">{letter}</span>
                        </div>
                    </div>
                </div>

                {/* Answer Input Form */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">
                        My Answers
                    </h3>

                    {gameState.categories.map((category) => (
                        <div key={category} className="flex items-center space-x-4">
                            <label className="w-32 font-semibold">{category}:</label>
                            <Input
                                type="text"
                                placeholder={`${category} starting with ${letter}`}
                                value={myAnswers[category] || ''}
                                onChange={(e) => setAnswerForCategory(category, e.target.value)}
                                disabled={someoneStoppedRound}
                                className="flex-1"
                            />
                            {myAnswers[category]?.trim() && (
                                <span className="text-green-500">✓</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                    {mode === 'classic' && !someoneStoppedRound && (
                        <Button
                            onClick={onStopRound}
                            disabled={!allAnswersFilled}
                            size="large"
                            variant="secondary"
                        >
                            🛑 Stop!
                        </Button>
                    )}

                    {(mode === 'timer' || someoneStoppedRound) && (
                        <Button
                            onClick={onSubmit}
                            disabled={mode === 'timer' && !someoneStoppedRound && timeRemaining > 0}
                            size="large"
                            variant="primary"
                        >
                            {someoneStoppedRound ? 'Proceed to Review' : 'Waiting for timer...'}
                        </Button>
                    )}
                </div>

                {mode === 'classic' && !allAnswersFilled && !someoneStoppedRound && (
                    <p className="text-center text-sm text-gray-500">
                        Fill all categories to hit the Stop! button
                    </p>
                )}

                {/* Instructions */}
                <div className="text-center text-sm text-gray-600 mt-6">
                    {mode === 'classic' && (
                        <p className="mt-1">First player to finish their set and click Stop ends the round for everyone!</p>
                    )}
                </div>
            </div>
        </div>
    )
}
