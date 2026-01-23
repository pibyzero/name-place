/**
 * Calculates scores for players
 * Rule: 1 point per category if valid votes > invalid votes, otherwise 0
 */

import { AnswersReview, Player, RoundData } from "../types/game";

interface PlayerScores {
    [playerId: string]: { total: number; byCategory: { [category: string]: number } };
}

export function calculateRoundScores(roundData: RoundData, categories: string[]): PlayerScores {
    const { answers, reviews } = roundData;
    const playerIds = Object.keys(answers);
    const playerScores: PlayerScores = {};

    playerIds.forEach(playerId => {
        const byCategory = categories.reduce((acc, category) => {
            const answer = answers[playerId]?.[category];
            const hasAnswer = answer?.trim();
            acc[category] = hasAnswer && isAnswerValid(playerId, category, reviews) ? 1 : 0;
            return acc;
        }, {} as { [category: string]: number });

        const total = Object.values(byCategory).reduce((sum, score) => sum + score, 0);
        playerScores[playerId] = { total, byCategory };
    });

    return playerScores;
}

export function isAnswerValid(playerId: string, category: string, reviews: Record<string, AnswersReview>): boolean {
    const votes = Object.values(reviews)
        .filter(r => r.reviewer !== playerId)
        .map(r => r.reviews[playerId]?.[category])
        .filter(v => v !== undefined);

    if (votes.length === 0) return false;

    const validCount = votes.filter(v => v === true).length;
    return validCount > votes.length - validCount;
}

export function calculateCumulativeScores(rounds: RoundData[], categories: string[]): PlayerScores {
    const cumulative: PlayerScores = {};

    rounds.forEach(round => {
        const playerScores = calculateRoundScores(round, categories);

        Object.entries(playerScores).forEach(([pid, scores]) => {
            if (!cumulative[pid]) cumulative[pid] = { total: 0, byCategory: {} };
            cumulative[pid].total += scores.total;

            categories.forEach(cat => {
                cumulative[pid].byCategory[cat] = (cumulative[pid].byCategory[cat] || 0) + scores.byCategory[cat];
            });
        });
    });

    return cumulative;
}

export function getLeaderboard(playerScores: PlayerScores, players: Player[]) {
    return Object.entries(playerScores)
        .map(([playerId, scores]) => ({
            playerId,
            name: players.find(p => p.id === playerId)?.name || 'Unknown',
            ...scores
        }))
        .sort((a, b) => b.total - a.total);
}
