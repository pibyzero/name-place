import { FC } from 'react'
import { Player, PlayerAnswers, ValidationVote } from '../../types/game'
import { Button } from '../ui/Button'
import { calculateRoundScores, getPlayerScores, isAnswerValid } from '../../utils/scoring'

interface LeaderboardProps {
    players: Player[]
    answers: Record<string, PlayerAnswers>
    validations: ValidationVote[]
    categories: string[]
    letter: string
    currentRound: number
    totalScores: Map<string, number>
    onNextRound: () => void
    onEndGame: () => void
}

export const Leaderboard: FC<LeaderboardProps> = ({
    players,
    answers,
    validations,
    categories,
    letter,
    currentRound,
    totalScores,
    onNextRound,
    onEndGame
}) => {
    // Calculate round scores
    const roundScores = calculateRoundScores(answers, validations, categories)

    // Update total scores with round scores
    const updatedTotalScores = new Map(totalScores)
    roundScores.forEach((score, playerId) => {
        updatedTotalScores.set(playerId, (totalScores.get(playerId) || 0) + score)
    })

    // Get sorted player scores
    const playerScores = getPlayerScores(players, roundScores, updatedTotalScores)

    // Get medal emoji based on position
    const getMedal = (position: number) => {
        switch (position) {
            case 0: return '🥇'
            case 1: return '🥈'
            case 2: return '🥉'
            default: return `${position + 1}.`
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">Round {currentRound} Results</h2>
                    <p className="text-lg text-gray-700">
                        Letter: <span className="font-bold text-coral">{letter}</span>
                    </p>
                </div>

                {/* Detailed Scores */}
                <div>
                    <h3 className="text-xl font-bold mb-6">Round Scores</h3>

                    {playerScores.map((playerScore, index) => {
                        const player = players.find(p => p.id === playerScore.playerId)
                        const playerAnswers = answers.get(playerScore.playerId) || {}

                        return (
                            <div key={playerScore.playerId} className="mb-6 p-4 bg-white bg-opacity-40 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <span className="text-2xl mr-3">{getMedal(index)}</span>
                                        <span className="text-xl font-semibold">{player?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-coral">
                                            +{playerScore.roundScore} pts
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Total: {playerScore.totalScore} pts
                                        </div>
                                    </div>
                                </div>

                                {/* Show answer breakdown */}
                                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                    {categories.map(category => {
                                        const answer = playerAnswers[category]
                                        const hasAnswer = answer?.trim()
                                        const isValid = isAnswerValid(validations, playerScore.playerId, category, answer)

                                        // Check for duplicates
                                        const duplicateCount = Array.from(answers.values())
                                            .filter(a => a[category]?.toLowerCase().trim() === answer?.toLowerCase().trim())
                                            .length

                                        const isDuplicate = duplicateCount > 1

                                        return (
                                            <div key={category} className="flex justify-between">
                                                <span className="font-medium">{category}:</span>
                                                <span>
                                                    {hasAnswer ? (
                                                        isValid ? (
                                                            isDuplicate ? '5 pts (dup)' : '10 pts'
                                                        ) : '0 pts (invalid)'
                                                    ) : '0 pts'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Overall Standings */}
                <div className="border-t border-gray-300 pt-6">
                    <h3 className="text-lg font-bold mb-4">Overall Standings</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                        {playerScores
                            .sort((a, b) => b.totalScore - a.totalScore)
                            .map((playerScore, index) => {
                                const player = players.find(p => p.id === playerScore.playerId)
                                return (
                                    <div key={playerScore.playerId} className="text-center bg-white bg-opacity-40 px-6 py-3 rounded-lg">
                                        <div className="font-semibold">{player?.name}</div>
                                        <div className="text-2xl font-bold text-teal">
                                            {playerScore.totalScore} pts
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                    <Button onClick={onNextRound} size="large" variant="primary">
                        Next Round
                    </Button>
                    <Button onClick={onEndGame} size="large" variant="secondary">
                        End Game
                    </Button>
                </div>
            </div>
        </div>
    )
}
