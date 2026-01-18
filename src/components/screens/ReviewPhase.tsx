import { FC, useState } from 'react'
import { Player, PlayerAnswers, ValidationVote } from '../../types/game'
import { Button } from '../ui/Button'
import { PlayerTabs } from '../ui/PlayerTabs'

interface ReviewPhaseProps {
    players: Player[]
    currentPlayerId: string
    answers: Map<string, PlayerAnswers>
    categories: string[]
    letter: string
    currentRound: number
    reviewsSubmitted: Set<string>
    onSelectPlayer: (playerId: string) => void
    onSubmitReview: (validations: ValidationVote[]) => void
}

export const ReviewPhase: FC<ReviewPhaseProps> = ({
    players,
    currentPlayerId,
    answers,
    categories,
    letter,
    currentRound,
    reviewsSubmitted,
    onSelectPlayer,
    onSubmitReview
}) => {
    const [validations, setValidations] = useState<Map<string, Map<string, boolean>>>(new Map())
    const currentPlayer = players.find(p => p.id === currentPlayerId)
    const hasSubmitted = reviewsSubmitted.has(currentPlayerId)
    const otherPlayers = players.filter(p => p.id !== currentPlayerId)

    const handleValidation = (playerId: string, category: string, isValid: boolean) => {
        const playerValidations = validations.get(playerId) || new Map()
        playerValidations.set(category, isValid)
        const newValidations = new Map(validations)
        newValidations.set(playerId, playerValidations)
        setValidations(newValidations)
    }

    const toggleValidation = (playerId: string, category: string) => {
        const playerValidations = validations.get(playerId) || new Map()
        const currentValue = playerValidations.get(category)

        // Cycle through: unset -> valid -> invalid -> unset
        if (currentValue === undefined) {
            handleValidation(playerId, category, true)
        } else if (currentValue === true) {
            handleValidation(playerId, category, false)
        } else {
            playerValidations.delete(category)
            const newValidations = new Map(validations)
            newValidations.set(playerId, playerValidations)
            setValidations(newValidations)
        }
    }

    const handleSubmit = () => {
        const votes: ValidationVote[] = []
        validations.forEach((categoryValidations, playerId) => {
            categoryValidations.forEach((isValid, category) => {
                votes.push({
                    validatorId: currentPlayerId,
                    playerId,
                    category,
                    isValid
                })
            })
        })
        onSubmitReview(votes)
    }

    // Check if all non-empty answers have been validated
    const getNonEmptyAnswerCount = () => {
        let count = 0
        otherPlayers.forEach(player => {
            const playerAnswers = answers.get(player.id) || {}
            categories.forEach(cat => {
                if (playerAnswers[cat]?.trim()) count++
            })
        })
        return count
    }

    const getValidatedCount = () => {
        let count = 0
        validations.forEach((categoryValidations) => {
            count += categoryValidations.size
        })
        return count
    }

    const nonEmptyCount = getNonEmptyAnswerCount()
    const validatedCount = getValidatedCount()
    const allValidated = nonEmptyCount === 0 || validatedCount === nonEmptyCount

    const getValidationStatus = (playerId: string, category: string) => {
        const playerValidations = validations.get(playerId)
        if (!playerValidations) return undefined
        return playerValidations.get(category)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-7xl w-full space-y-6">
                {/* Header */}
                <div className="text-center bg-white rounded-2xl shadow-xl p-4">
                    <h2 className="text-2xl font-bold mb-2">Review Phase - Round {currentRound}</h2>
                    <p className="text-lg text-gray-600">Letter: <span className="font-bold text-coral">{letter}</span></p>
                    <div className="mt-4 flex justify-center gap-2">
                        <span className="text-sm">Reviews submitted:</span>
                        {players.map(player => (
                            <span
                                key={player.id}
                                className={`text-sm px-2 py-1 rounded ${
                                    reviewsSubmitted.has(player.id)
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {player.name} {reviewsSubmitted.has(player.id) ? '✓' : '⏳'}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Player Selector */}
                <div className="bg-white rounded-2xl shadow-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Reviewing as:</h3>
                    <PlayerTabs
                        players={players}
                        currentPlayerId={currentPlayerId}
                        onSelectPlayer={onSelectPlayer}
                        showStatus={true}
                        submittedPlayers={reviewsSubmitted}
                    />
                </div>

                {/* Review Interface - Matrix View */}
                <div className="bg-white rounded-2xl shadow-xl p-6 overflow-x-auto">
                    {hasSubmitted ? (
                        <div className="text-center py-8">
                            <p className="text-xl font-semibold text-green-600 mb-2">
                                ✓ {currentPlayer?.name}'s review submitted!
                            </p>
                            <p className="text-gray-600">
                                Waiting for other players to finish reviewing...
                            </p>
                        </div>
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
                                {currentPlayer?.name}, validate answers:
                            </h3>

                            {/* Matrix Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-300">
                                            <th className="text-left py-2 px-3 font-semibold">Player</th>
                                            {categories.map(cat => (
                                                <th key={cat} className="text-left py-2 px-3 font-semibold text-sm">
                                                    {cat}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {otherPlayers.map((player, idx) => {
                                            const playerAnswers = answers.get(player.id) || {}

                                            return (
                                                <tr key={player.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                    <td className="py-3 px-3 font-medium">{player.name}</td>
                                                    {categories.map(category => {
                                                        const answer = playerAnswers[category]
                                                        const hasAnswer = answer?.trim()
                                                        const validationStatus = getValidationStatus(player.id, category)

                                                        return (
                                                            <td key={category} className="py-3 px-3">
                                                                {hasAnswer ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-sm">{answer}</span>
                                                                        <button
                                                                            onClick={() => toggleValidation(player.id, category)}
                                                                            className={`
                                                                                text-xs px-2 py-1 rounded transition-all
                                                                                ${validationStatus === true
                                                                                    ? 'bg-green-500 text-white'
                                                                                    : validationStatus === false
                                                                                        ? 'bg-red-500 text-white'
                                                                                        : 'bg-gray-200 hover:bg-gray-300'
                                                                                }
                                                                            `}
                                                                        >
                                                                            {validationStatus === true
                                                                                ? '✓ Valid'
                                                                                : validationStatus === false
                                                                                    ? '✗ Invalid'
                                                                                    : 'Click to validate'
                                                                            }
                                                                        </button>
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
                                        Click each answer to cycle: Unset → Valid → Invalid
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Instructions */}
                <div className="text-center text-sm text-gray-500">
                    <p>Empty answers automatically score 0 points</p>
                    <p>Answers are valid if the majority votes them as valid</p>
                </div>
            </div>
        </div>
    )
}