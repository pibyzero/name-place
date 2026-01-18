import { PlayerAnswers, ValidationVote, PlayerScore } from '../types/game'
import { POINTS_UNIQUE, POINTS_DUPLICATE } from './constants'

// Normalize answer for comparison (lowercase, trim)
export const normalizeAnswer = (answer: string): string => {
    return answer.toLowerCase().trim()
}

// Find duplicate answers across players for a category
export const findDuplicateAnswers = (
    answers: Map<string, PlayerAnswers>,
    category: string
): Set<string> => {
    const normalizedAnswers = new Map<string, string[]>() // normalized answer -> playerIds
    const duplicatePlayers = new Set<string>()

    answers.forEach((playerAnswers, playerId) => {
        const answer = playerAnswers[category]
        if (!answer || !answer.trim()) return

        const normalized = normalizeAnswer(answer)
        if (!normalizedAnswers.has(normalized)) {
            normalizedAnswers.set(normalized, [])
        }
        normalizedAnswers.get(normalized)!.push(playerId)
    })

    // Mark all players with duplicate answers
    normalizedAnswers.forEach((playerIds) => {
        if (playerIds.length > 1) {
            playerIds.forEach(id => duplicatePlayers.add(id))
        }
    })

    return duplicatePlayers
}

// Check if an answer is valid based on majority vote
export const isAnswerValid = (
    validations: ValidationVote[],
    playerId: string,
    category: string,
    answer?: string
): boolean => {
    // Empty answers are always invalid (0 points)
    if (!answer || !answer.trim()) return false

    const relevantVotes = validations.filter(
        v => v.playerId === playerId && v.category === category
    )

    if (relevantVotes.length === 0) return true // Default to valid if no votes

    const validCount = relevantVotes.filter(v => v.isValid).length
    const invalidCount = relevantVotes.filter(v => !v.isValid).length

    // Majority wins, tie defaults to valid
    return validCount >= invalidCount
}

// Calculate scores for all players in a round
export const calculateRoundScores = (
    answers: Map<string, PlayerAnswers>,
    validations: ValidationVote[],
    categories: string[]
): Map<string, number> => {
    const scores = new Map<string, number>()

    // Initialize scores
    answers.forEach((_, playerId) => {
        scores.set(playerId, 0)
    })

    // Calculate score for each category
    categories.forEach(category => {
        const duplicatePlayers = findDuplicateAnswers(answers, category)

        answers.forEach((playerAnswers, playerId) => {
            const answer = playerAnswers[category]

            // Empty answer = 0 points
            if (!answer || !answer.trim()) {
                return
            }

            // Invalid answer = 0 points
            if (!isAnswerValid(validations, playerId, category, answer)) {
                return
            }

            // Valid answer - check if duplicate
            const isDuplicate = duplicatePlayers.has(playerId)
            const points = isDuplicate ? POINTS_DUPLICATE : POINTS_UNIQUE

            scores.set(playerId, (scores.get(playerId) || 0) + points)
        })
    })

    return scores
}

// Get player scores sorted by round score (for leaderboard)
export const getPlayerScores = (
    players: { id: string; name: string }[],
    roundScores: Map<string, number>,
    totalScores: Map<string, number>
): PlayerScore[] => {
    return players
        .map(player => ({
            playerId: player.id,
            roundScore: roundScores.get(player.id) || 0,
            totalScore: totalScores.get(player.id) || 0
        }))
        .sort((a, b) => b.roundScore - a.roundScore)
}