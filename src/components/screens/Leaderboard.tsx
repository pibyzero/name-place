import { FC, useMemo } from 'react'
import { GameState, LocalState } from '../../types/game'
import { calculateCumulativeScores, getLeaderboard } from '../../utils/scoring'
import { GameLayout } from '../ui/GameLayout'

interface LeaderboardProps {
    gameState: GameState
    localState: LocalState
}

export const Leaderboard: FC<LeaderboardProps> = ({
    gameState,
    localState,
}) => {
    const leaderboard = useMemo(() => {
        const scores = calculateCumulativeScores(gameState.allRounds, gameState.categories);
        return getLeaderboard(scores, gameState.players);
    }, [gameState])

    const getMedal = (position: number) => {
        switch (position) {
            case 0: return '🥇'
            case 1: return '🥈'
            case 2: return '🥉'
            default: return null
        }
    }

    return (
        <GameLayout maxWidth="md" centerVertically>
            <div className="w-full space-y-8">
                {/* Improved Headings */}
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-coral mb-2">Final Standings</h2>
                    <p className="text-gray-600">
                        {gameState.allRounds.length} {gameState.allRounds.length === 1 ? 'round' : 'rounds'} played - Well done everyone!
                    </p>
                </div>

                {/* Simplified List */}
                <div className="space-y-3">
                    {leaderboard.map((entry, index) => {
                        const isSelf = entry.playerId === localState.player.id;
                        const medal = getMedal(index);

                        return (
                            <div
                                key={entry.playerId}
                                className={`flex items-center justify-between py-4 px-4 rounded-lg ${isSelf ? 'bg-coral bg-opacity-10 border-2 border-coral' : 'bg-white bg-opacity-40'
                                    }`}
                            >
                                <div className="flex items-center gap-5">
                                    {/* Rank or Medal */}
                                    <div className="w-8 flex justify-center">
                                        {medal ? (
                                            <span className="text-2xl">{medal}</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-400">
                                                {index + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <span className={`text-lg ${isSelf ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                        {entry.name}
                                        {isSelf && <span className="ml-2 text-xs text-coral font-bold uppercase tracking-wider">(You)</span>}
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="text-right">
                                    <span className={`text-xl font-black ${isSelf ? 'text-coral' : 'text-gray-900'}`}>
                                        {entry.total}
                                    </span>
                                    <span className="ml-1 text-xs font-bold text-gray-400 uppercase">pts</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </GameLayout>
    )
}
