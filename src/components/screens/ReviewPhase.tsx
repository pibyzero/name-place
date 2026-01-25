import { FC, useCallback, useState } from 'react'
import { AnswersReview as RoundAnswersReview, GameState, LocalState, PlayersAnswersValidity } from '../../types/game'
import { Button } from '../ui/Button'
import { VoidWithArg } from '../../types/common'
import { PlayerStatusCard } from '../ui/PlayerCard'
import { GameLayout } from '../ui/GameLayout'

interface ReviewPhaseProps {
    localState: LocalState
    gameState: GameState
    onSubmitReview: VoidWithArg<RoundAnswersReview>
}

export const ReviewPhase: FC<ReviewPhaseProps> = ({
    localState,
    gameState,
    onSubmitReview
}) => {
    const [reviews, setReviews] = useState<PlayersAnswersValidity>({})
    const [allReviewsWaiting, setAllReviewsWaiting] = useState(false)

    const reviewsSubmitted = Object.keys(gameState.roundData?.reviews || {});
    const players = gameState.players
    let currentPlayerId = localState.player.id;

    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
    const hasSubmitted = reviewsSubmitted.includes(currentPlayerId)
    const otherPlayers = players.filter(p => p.id !== currentPlayerId)
    const currentPlayerAnswers = Object.entries(gameState.roundData?.answers || {})
        .filter(([p, _]) => p == currentPlayerId)
        .map(([_, a]) => a)[0];

    const handleCellReview = (playerId: string, category: string, isValid: boolean) => {
        setReviews(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [category]: isValid
            }
        }))
    }

    const categories = gameState.categories;
    const answers = gameState.roundData?.answers || {};
    const stoppedBy = gameState.players.filter(p => p.id == gameState.roundData?.stoppedBy)[0]?.name

    const handleSubmit = useCallback(() => {
        const allReview: RoundAnswersReview = {
            reviewer: localState.player.id,
            reviews: reviews
        };
        setAllReviewsWaiting(true)
        onSubmitReview(allReview)
    }, [localState, reviews])

    // Check if all non-empty answers have been validated
    const getNonEmptyAnswerCount = useCallback(() => {
        let count = 0
        otherPlayers.forEach(player => {
            const playerAnswers = answers[player.id] || {}
            categories.forEach(cat => {
                if (playerAnswers[cat]?.trim()) count++
            })
        })
        return count
    }, [otherPlayers, answers])

    const getValidatedCount = useCallback(() => {
        let count = 0
        otherPlayers.forEach(player => {
            const playerAnswers = answers[player.id] || {}
            categories.forEach(cat => {
                const plreview = reviews[player.id] || {}
                if (playerAnswers[cat]?.trim() && plreview[cat] !== undefined) count++
            })
        })

        return count
    }, [otherPlayers])

    const nonEmptyCount = getNonEmptyAnswerCount()
    const validatedCount = getValidatedCount()
    const allValidated = nonEmptyCount === 0 || validatedCount === nonEmptyCount

    const getValidationStatus = useCallback((playerId: string, category: string) => {
        let plreview = reviews[playerId] || {}
        return plreview[category]
    }, [reviews])

    const submittedCount = reviewsSubmitted.length
    const totalPlayers = gameState.players.length
    const allReviewsSubmitted = submittedCount === totalPlayers

    // Sort players: submitted first, then current user, then others
    const sortedPlayers = [...gameState.players].sort((a, b) => {
        const aSubmitted = reviewsSubmitted.includes(a.id)
        const bSubmitted = reviewsSubmitted.includes(b.id)
        const aIsCurrent = a.id === localState.player.id
        const bIsCurrent = b.id === localState.player.id

        if (!hasSubmitted && aIsCurrent) return -1
        if (!hasSubmitted && bIsCurrent) return 1
        if (aSubmitted && !bSubmitted) return -1
        if (!aSubmitted && bSubmitted) return 1
        return 0
    })

    return (
        <GameLayout maxWidth="lg">
            <div className="w-full space-y-6">

                {/* Review Interface - Matrix View */}
                <div className="overflow-x-auto">
                    {hasSubmitted ? (
                        <>
                            <div className="text-center mb-6 space-y-4">
                                {allReviewsSubmitted ? (
                                    <>
                                        <div className="text-6xl animate-bounce">✓</div>
                                        <p className="text-2xl font-bold text-teal">
                                            All reviews submitted!
                                        </p>
                                        <p className="text-gray-600">
                                            Calculating scores...
                                        </p>
                                    </>
                                ) : (
                                    <>
                                    </>
                                )}
                            </div>

                            {/* Show submitted review in read-only mode */}
                            <div className="overflow-x-auto relative bg-white bg-opacity-40 rounded-xl">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-400">
                                            <th className="text-left py-2 px-3 font-semibold sticky left-0 z-10 bg-white backdrop-blur-sm">
                                                Player
                                            </th>
                                            {categories.map(cat => (
                                                <th key={cat} className="text-left py-2 px-3 font-semibold text-sm">
                                                    {cat}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Show current player's answers for reference */}
                                        <tr className="bg-yellow bg-opacity-10 border-b-2 border-gray-400">
                                            <td className="py-3 px-3 font-medium sticky left-0 z-10 bg-yellow bg-opacity-20 backdrop-blur-sm">
                                                {currentPlayer?.name} (You)
                                            </td>
                                            {categories.map(category => {
                                                const answer = currentPlayerAnswers[category]
                                                const hasAnswer = answer?.trim()
                                                return (
                                                    <td key={category} className="py-3 px-3">
                                                        <span className={`text-sm font-medium ${hasAnswer ? 'text-charcoal' : 'text-gray-400 italic'}`}>
                                                            {hasAnswer ? answer : 'empty'}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>

                                        {/* Other players' answers with submitted validations */}
                                        {otherPlayers.map((player, idx) => {
                                            const playerAnswers = answers[player.id] || {}
                                            const rowBgColor = idx % 2 === 0 ? 'bg-white bg-opacity-30' : ''

                                            return (
                                                <tr key={player.id} className={rowBgColor}>
                                                    <td className={`py-3 px-3 font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-cream'} backdrop-blur-sm`}>
                                                        {player.name}
                                                    </td>
                                                    {categories.map(category => {
                                                        const answer = playerAnswers[category]
                                                        const hasAnswer = answer?.trim()
                                                        const validationStatus = getValidationStatus(player.id, category)

                                                        return (
                                                            <td key={category} className="py-3 px-3">
                                                                {hasAnswer ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-sm font-medium">{answer}</span>
                                                                        {validationStatus !== undefined && (
                                                                            <div className={`text-xs px-2 py-1 rounded-md text-center font-semibold ${validationStatus
                                                                                ? 'bg-teal bg-opacity-20 text-teal border border-teal'
                                                                                : 'bg-coral bg-opacity-20 text-coral border border-coral'
                                                                                }`}>
                                                                                {validationStatus ? '✓ Valid' : '✗ Invalid'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 italic text-sm">empty</span>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : nonEmptyCount === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-xl font-semibold text-gray-600 mb-2">
                                No answers to review!
                            </p>
                            <p className="text-gray-500">
                                All players left their answers empty.
                            </p>
                            <Button onClick={handleSubmit} size="large" className="mt-4">
                                Proceed to Results
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white bg-opacity-40 rounded-xl p-6 mb-6">
                                <div className="flex items-center justify-center gap-4 mb-3">
                                    <div className="h-px bg-gray-300 flex-1"></div>
                                    <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Round Stopped</span>
                                    <div className="h-px bg-gray-300 flex-1"></div>
                                </div>
                                <p className="text-center text-gray-700 mb-2">
                                    <span className="font-bold text-coral">{stoppedBy}</span> completed all answers first!
                                </p>
                                <p className="text-center text-lg font-semibold text-gray-800">
                                    Now reviewing all player answers for validity
                                </p>
                            </div>

                            {/* Matrix Table */}
                            <div className="overflow-x-auto relative bg-white bg-opacity-40 rounded-xl">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-400">
                                            <th className="text-left py-2 px-3 font-semibold sticky left-0 z-10 bg-white backdrop-blur-sm">
                                                Player
                                            </th>
                                            {categories.map(cat => (
                                                <th key={cat} className="text-left py-2 px-3 font-semibold text-sm">
                                                    {cat}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Show current player's answers for reference */}
                                        <tr className="bg-yellow bg-opacity-10 border-b-2 border-gray-400">
                                            <td className="py-3 px-3 font-medium sticky left-0 z-10 bg-yellow bg-opacity-20 backdrop-blur-sm">
                                                {currentPlayer?.name} (You)
                                            </td>
                                            {categories.map(category => {
                                                const answer = currentPlayerAnswers[category]
                                                const hasAnswer = answer?.trim()
                                                return (
                                                    <td key={category} className="py-3 px-3">
                                                        <span className={`text-sm font-medium ${hasAnswer ? 'text-charcoal' : 'text-gray-400 italic'}`}>
                                                            {hasAnswer ? answer : 'empty'}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>

                                        {/* Other players' answers to review */}
                                        {otherPlayers.map((player, idx) => {
                                            const playerAnswers = answers[player.id] || {}
                                            const rowBgColor = idx % 2 === 0 ? 'bg-white bg-opacity-30' : ''

                                            return (
                                                <tr key={player.id} className={rowBgColor}>
                                                    <td className={`py-3 px-3 font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-cream'} backdrop-blur-sm`}>
                                                        {player.name}
                                                    </td>
                                                    {categories.map(category => {
                                                        const answer = playerAnswers[category]
                                                        const hasAnswer = answer?.trim()
                                                        const validationStatus = getValidationStatus(player.id, category)

                                                        return (
                                                            <td key={category} className="py-3 px-3">
                                                                {hasAnswer ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-sm font-medium">{answer}</span>
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => handleCellReview(player.id, category, true)}
                                                                                className={`
                                                                                    text-xs px-2 py-1 rounded-md flex-1 transition-all duration-200 font-semibold
                                                                                    ${validationStatus === true
                                                                                        ? 'bg-teal text-white hover:bg-opacity-90'
                                                                                        : 'bg-white bg-opacity-60 hover:bg-teal hover:bg-opacity-20 text-gray-700 border border-gray-300'
                                                                                    }
                                                                                `}
                                                                            >
                                                                                ✓
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleCellReview(player.id, category, false)}
                                                                                className={`
                                                                                    text-xs px-2 py-1 rounded-md flex-1 transition-all duration-200 font-semibold
                                                                                    ${validationStatus === false
                                                                                        ? 'bg-coral text-white hover:bg-opacity-90'
                                                                                        : 'bg-white bg-opacity-60 hover:bg-coral hover:bg-opacity-20 text-gray-700 border border-gray-300'
                                                                                    }
                                                                                `}
                                                                            >
                                                                                ✗
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 italic text-sm">empty</span>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 text-center">
                                <div className="mb-3 text-sm text-gray-600">
                                    Validated {validatedCount} of {nonEmptyCount} answers
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!allValidated}
                                    size="large"
                                >
                                    Submit Review
                                </Button>
                                {!allValidated && (
                                    <div className="mt-3 space-y-1">
                                        <p className="text-sm text-gray-600 font-medium">
                                            How to validate:
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            ✓ Valid - Answer starts with the letter and fits the category
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            ✗ Invalid - Wrong letter, doesn't fit, or misspelled
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Instructions */}
                <div className="bg-yellow bg-opacity-10 border border-yellow rounded-lg p-4 mt-6">
                    <p className="text-sm text-gray-700 text-center">
                        <span className="font-semibold">Scoring Rules:</span> Empty answers = 0 points •
                        Valid answers = 1 point •
                        Duplicate answers = 0 points
                    </p>
                    <p className="text-xs text-gray-600 text-center mt-1">
                        Answers are validated by majority vote
                    </p>
                </div>
            </div>

            {/* Overlay */}
            {allReviewsWaiting && (
                <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className="mb-4">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Review Submitted!</h3>
                        <p className="text-gray-600 mb-6 space-y-4">
                            Waiting for all players to submit their reviews...
                        </p>
                        <p className="text-gray-600 mb-6 space-y-4">
                            {submittedCount} of {totalPlayers} {totalPlayers === 1 ? 'player has' : 'players have'} submitted
                        </p>

                        <div className="space-y-3 max-w-md mx-auto mb-6">
                            {sortedPlayers.map(player => (
                                <PlayerStatusCard
                                    key={player.id}
                                    player={player}
                                    isChecked={reviewsSubmitted.includes(player.id)}
                                    isCurrentUser={player.id === localState.player.id}
                                />
                            ))}
                        </div>

                    </div>
                </div>
            )}
        </GameLayout>
    )
}
