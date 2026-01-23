import { FC, useCallback, useState } from 'react'
import { AnswersReview as RoundAnswersReview, GameState, LocalState, PlayersAnswersValidity } from '../../types/game'
import { Button } from '../ui/Button'
import { VoidWithArg } from '../../types/common'

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

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Review Phase - Round {gameState.currentRound}</h2>
                    <p className="text-lg text-gray-700">Letter: <span className="font-bold text-coral">{gameState.roundData?.letter}</span></p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {gameState.players.map(player => (
                            <span
                                key={player.id}
                                className={`text-sm px-3 py-1.5 rounded-full ${reviewsSubmitted.includes(player.id)
                                    ? 'bg-green-200 text-green-800 font-medium'
                                    : 'bg-white bg-opacity-60 text-gray-600'
                                    }`}
                            >
                                {player.name} {reviewsSubmitted.includes(player.id) ? '✓' : '⏳'}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Player Selector
                <div className="border-b border-gray-300 pb-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Reviewing as</h3>
                    <PlayerTabs
                        players={players}
                        currentPlayerId={currentPlayerId}
                        onSelectPlayer={onSelectPlayer}
                        showStatus={true}
                        submittedPlayers={reviewsSubmitted}
                    />
                </div>
                */}

                {/* Review Interface - Matrix View */}
                <div className="overflow-x-auto">
                    {hasSubmitted ? (
                        <>
                            <div className="text-center mb-4 p-4 bg-green-100 rounded-lg">
                                <p className="text-xl font-semibold text-green-700">
                                    ✓ {currentPlayer?.name}'s review submitted!
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Your votes are shown below (read-only)
                                </p>
                            </div>

                            {/* Show submitted review in read-only mode */}
                            <div className="overflow-x-auto relative bg-white bg-opacity-40 rounded-lg">
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
                                                                            <div className={`text-xs px-2 py-1 rounded text-center font-semibold ${validationStatus
                                                                                ? 'bg-green-100 text-green-700'
                                                                                : 'bg-red-100 text-red-700'
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

                            <div className="text-center mt-4 text-sm text-gray-600">
                                <p>Waiting for other players to finish reviewing...</p>
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
                            <h3 className="text-xl font-bold mb-4">
                                The game has been stopped by {stoppedBy}<br />
                                {currentPlayer?.name}, you are now reviewing answers:
                            </h3>

                            {/* Matrix Table */}
                            <div className="overflow-x-auto relative bg-white bg-opacity-40 rounded-lg">
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
                                                                                    text-xs px-2 py-1 rounded flex-1 transition-all
                                                                                    ${validationStatus === true
                                                                                        ? 'bg-green-500 text-white font-semibold'
                                                                                        : 'bg-gray-200 hover:bg-green-100 text-gray-700'
                                                                                    }
                                                                                `}
                                                                            >
                                                                                ✓
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleCellReview(player.id, category, false)}
                                                                                className={`
                                                                                    text-xs px-2 py-1 rounded flex-1 transition-all
                                                                                    ${validationStatus === false
                                                                                        ? 'bg-red-500 text-white font-semibold'
                                                                                        : 'bg-gray-200 hover:bg-red-100 text-gray-700'
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
                                    <p className="text-sm text-gray-500 mt-2">
                                        Click ✓ for valid or ✗ for invalid (click again to unset)
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Instructions */}
                <div className="text-center text-sm text-gray-600 mt-6">
                    <p>Empty answers automatically score 0 points</p>
                    <p>Answers are valid if the majority votes them as valid</p>
                </div>
            </div>
            {/* Overlay */}
            {allReviewsWaiting && (
                <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className="mb-4">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Review Submitted!</h3>
                        <p className="text-gray-600">
                            Waiting for all players to submit their reviews...
                        </p>
                    </div>
                </div>
            )}

        </div>
    )
}
