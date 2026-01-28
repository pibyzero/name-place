import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { GameState, PlayerAnswers } from '../../types/game'
import { VoidWithArg } from '../../types/common'
import { GameLayout } from '../ui/GameLayout'

interface RoundPlayProps {
    gameState: GameState
    onClickStopRound: VoidWithArg<PlayerAnswers>
    broadcastAnswers: VoidWithArg<PlayerAnswers>
    requestEventsSync: () => void
}

export const RoundPlay: FC<RoundPlayProps> = ({
    gameState,
    onClickStopRound,
    broadcastAnswers,
    requestEventsSync
}) => {
    const [myAnswers, setMyAnswers] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)


    useEffect(() => {
        // If not submitting answers but has been stopped, submit answers
        if (isSubmitting) return
        if (!gameState?.roundData?.stoppedBy) return
        setIsSubmitting(true)
        broadcastAnswers(myAnswers)
    }, [myAnswers, gameState, isSubmitting])

    // Recovery mechanism: request event sync if stuck
    useEffect(() => {
        if (!gameState?.roundData?.stoppedBy) return // Round not stopped yet
        if (gameState.status === 'reviewing') return // Already transitioned

        // Set a timer to request sync if stuck for 5 seconds
        const timer = setTimeout(() => {
            console.warn('Stuck waiting for review phase, requesting event sync from peers')
            requestEventsSync()
        }, 5000)

        return () => clearTimeout(timer)
    }, [gameState?.roundData?.stoppedBy, gameState.status, requestEventsSync])

    if (!gameState?.roundData?.letter) {
        return (
            <div>
                <p>Round not set properly</p>
            </div>
        )
    }

    // Check if any player has stopped the round
    const someoneStoppedRound = !!gameState.roundData.stoppedBy;

    const letter = gameState.roundData.letter;

    const stoppedBy = gameState.players.filter(p => p.id == gameState.roundData?.stoppedBy)[0]?.name
    const mode: string = 'classic'

    const turnPlayer = gameState.players[gameState.roundData?.turnPlayerIndex].name;

    const setAnswerForCategory = useCallback((cat: string, ans: string) => {
        setMyAnswers(prev => ({ ...prev, [cat]: ans }))
    }, [])

    const allAnswersFilled = useMemo(() => {
        // Check if all categories are filled
        return !gameState.categories.map(c => !!myAnswers[c]).some(x => !x)
    }, [myAnswers, gameState.categories])

    const onClickStop = useCallback(() => {
        onClickStopRound(myAnswers)
    }, [myAnswers, onClickStopRound])

    return (
        <GameLayout>
            <div className="space-y-6 relative">
                {/* Answers form */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-center">
                        <span className="text-coral"> {turnPlayer} </span> has chosen the initial <span className="text-coral">{letter}</span> for this round.
                        <br />
                        <small className="font-normal"> Fill in the words starting with <span className="text-coral">{letter}</span></small>
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
                                <span className="text-teal font-bold">✓</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Stop button */}
                <div className="flex justify-center">
                    {mode === 'classic' && !someoneStoppedRound && (
                        <Button
                            onClick={onClickStop}
                            disabled={!allAnswersFilled}
                            size="large"
                            variant="secondary"
                        >
                            🛑 Stop!
                        </Button>
                    )}
                </div>

                {/* Helper text */}
                {mode === 'classic' && !allAnswersFilled && !someoneStoppedRound && (
                    <p className="text-center text-sm text-gray-500">
                        Fill all categories to hit the Stop! button
                    </p>
                )}

                {mode === 'classic' && !someoneStoppedRound && (
                    <p className="text-center text-sm text-gray-600">
                        First player to finish their set and click Stop ends the round for everyone!
                    </p>
                )}

                {/* Overlay */}
                {someoneStoppedRound && (
                    <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
                            <div className="mb-4">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Round Stopped!</h3>
                            <p className="text-gray-700 mb-1">
                                <span className="font-semibold text-coral">{stoppedBy}</span> has stopped the round
                            </p>
                            <p className="text-gray-600">
                                Waiting for all players answers to be submitted automatically...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </GameLayout>
    )
}
