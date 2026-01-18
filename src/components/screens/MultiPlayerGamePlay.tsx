import { FC } from 'react'
import { Timer } from '../ui/Timer'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { PlayerTabs } from '../ui/PlayerTabs'
import { Player, PlayerAnswers, GameMode } from '../../types/game'

interface MultiPlayerGamePlayProps {
    letter: string
    categories: string[]
    players: Player[]
    currentPlayerId: string
    answers: Map<string, PlayerAnswers>
    timeRemaining: number
    currentRound: number
    mode: GameMode
    roundStopped: boolean
    onSelectPlayer: (playerId: string) => void
    onUpdateAnswer: (playerId: string, category: string, answer: string) => void
    onStopRound: () => void
    onSubmit: () => void
}

export const MultiPlayerGamePlay: FC<MultiPlayerGamePlayProps> = ({
    letter,
    categories,
    players,
    currentPlayerId,
    answers,
    timeRemaining,
    currentRound,
    mode,
    roundStopped,
    onSelectPlayer,
    onUpdateAnswer,
    onStopRound,
    onSubmit
}) => {
    const currentPlayer = players.find(p => p.id === currentPlayerId)
    const currentAnswers = answers.get(currentPlayerId) || {}
    const allAnswersFilled = categories.every(cat => currentAnswers[cat]?.trim())

    // Check if any player has stopped the round (for display)
    const someoneStoppedRound = roundStopped

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-4xl w-full space-y-6">
                {/* Round Info Header */}
                <div className="text-center bg-white rounded-2xl shadow-xl p-6">
                    <p className="text-lg text-gray-600 mb-2">Round {currentRound}</p>
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-lg font-semibold">Letter:</span>
                            <span className="text-4xl font-bold text-coral ml-4">{letter}</span>
                        </div>
                        {mode === 'timer' ? (
                            <Timer seconds={timeRemaining} />
                        ) : (
                            <div className="text-lg font-medium">
                                {someoneStoppedRound ? (
                                    <span className="text-red-500">Round Stopped!</span>
                                ) : (
                                    <span className="text-gray-600">Classic Mode</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Tabs */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-semibold mb-3">Playing as:</h3>
                    <PlayerTabs
                        players={players}
                        currentPlayerId={currentPlayerId}
                        onSelectPlayer={onSelectPlayer}
                    />
                </div>

                {/* Answer Input Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
                    <h3 className="text-xl font-bold mb-4">
                        {currentPlayer?.name}'s Answers:
                    </h3>

                    {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-4">
                            <label className="w-32 font-semibold">{category}:</label>
                            <Input
                                type="text"
                                placeholder={`${category} starting with ${letter}`}
                                value={currentAnswers[category] || ''}
                                onChange={(e) => onUpdateAnswer(currentPlayerId, category, e.target.value)}
                                disabled={someoneStoppedRound}
                                className="flex-1"
                            />
                            {currentAnswers[category]?.trim() && (
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
                        Fill all categories to enable the Stop button
                    </p>
                )}

                {/* Instructions */}
                <div className="text-center text-sm text-gray-500">
                    <p>Switch between players using the tabs above to fill in everyone's answers</p>
                    {mode === 'classic' && (
                        <p className="mt-1">First player to click Stop ends the round for everyone!</p>
                    )}
                </div>
            </div>
        </div>
    )
}