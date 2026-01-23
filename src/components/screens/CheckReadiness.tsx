import { FC, useMemo } from 'react'
import { GameState, LocalState } from '../../types/game'
import { GameLayout } from '../ui/GameLayout'
import { Button } from '../ui/Button'
import { PlayerStatusCard } from '../ui/PlayerCard'
import { calculateRoundScores, getLeaderboard } from '../../utils/scoring'


interface CheckReadinessProps {
    localState: LocalState
    gameState: GameState
    onReady: () => void
}

export const CheckReadiness: FC<CheckReadinessProps> = ({
    localState,
    gameState,
    onReady
}) => {
    const roundData = gameState.roundData

    if (!roundData) {
        return (
            <GameLayout centerVertically>
                <div className="text-center text-gray-600">
                    Something went wrong: no round data available for readiness check.
                </div>
            </GameLayout>
        )
    }

    const lastRoundLeaderboard = useMemo(() => {
        const lastRound = gameState.allRounds[gameState.allRounds.length - 1];
        const reviews = lastRound?.reviews;
        if (!reviews) return undefined;
        const scores = calculateRoundScores(lastRound, gameState.categories);
        return getLeaderboard(scores, gameState.players);
    }, [gameState])

    const isReady = roundData.readyPlayers.has(localState.player.id)
    const readyCount = roundData.readyPlayers.size
    const totalPlayers = gameState.players.length

    const sortedPlayers = [...gameState.players].sort((a, b) => {
        const aReady = roundData.readyPlayers.has(a.id)
        const bReady = roundData.readyPlayers.has(b.id)
        const aIsCurrent = a.id === localState.player.id
        const bIsCurrent = b.id === localState.player.id

        if (!isReady && aIsCurrent) return -1
        if (!isReady && bIsCurrent) return 1
        if (aReady && !bReady) return -1
        if (!aReady && bReady) return 1
        return 0
    })

    if (!isReady) {
        return (
            <GameLayout
                header={
                    <div className="text-center">
                        <p className="text-sm text-gray-600 uppercase tracking-wide">
                            Round {gameState.currentRound}
                        </p>
                    </div>
                }
                centerVertically
            >
                <div className="w-full space-y-8">
                    {lastRoundLeaderboard && (
                        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                                Round {gameState.currentRound - 1} Results
                            </h3>
                            <div className="space-y-2">
                                {lastRoundLeaderboard.map((entry, index) => (
                                    <div
                                        key={entry.playerId}
                                        className={`flex items-center justify-between p-3 rounded-lg ${entry.playerId === localState.player.id
                                            ? 'bg-coral bg-opacity-10 border-2 border-coral'
                                            : 'bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-gray-400 w-6">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {entry.name}
                                                {index === 0 && " ★"}
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold text-coral">
                                            {entry.total} {entry.total === 1 ? 'pt' : 'pts'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-center space-y-3">
                        <h2 className="text-4xl font-bold text-gray-800">
                            Ready for Round {gameState.roundData?.roundNumber}?
                        </h2>
                        {readyCount > 0 && (
                            <p className="text-gray-600">
                                {readyCount} of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} ready
                            </p>
                        )}
                    </div>

                    <div className="flex justify-center">
                        <Button
                            onClick={onReady}
                            className="bg-coral text-white hover:bg-opacity-90 hover:scale-105 shadow-lg text-xl py-4 px-12"
                        >
                            Yes, I'm Ready!
                        </Button>
                    </div>

                    <div className="space-y-3 max-w-md mx-auto">
                        {sortedPlayers.map(player => (
                            <PlayerStatusCard
                                key={player.id}
                                player={player}
                                isChecked={roundData.readyPlayers.has(player.id)}
                                isCurrentUser={player.id === localState.player.id}
                            />
                        ))}
                    </div>
                </div>
            </GameLayout>
        )
    }

    const allReady = readyCount === totalPlayers

    return (
        <GameLayout
            header={
                <div className="text-center">
                    <p className="text-sm text-gray-600 uppercase tracking-wide">
                        Round {gameState.currentRound}
                    </p>
                </div>
            }
            centerVertically
        >
            <div className="w-full space-y-8">
                {lastRoundLeaderboard && (
                    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                            Last Round Results
                        </h3>
                        <div className="space-y-2">
                            {lastRoundLeaderboard.map((entry, index) => (
                                <div
                                    key={entry.playerId}
                                    className={`flex items-center justify-between p-3 rounded-lg ${entry.playerId === localState.player.id
                                        ? 'bg-coral bg-opacity-10 border-2 border-coral'
                                        : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-gray-400 w-6">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-gray-800">
                                            {entry.name}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-coral">
                                        {entry.total} {entry.total === 1 ? 'pt' : 'pts'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center space-y-4">
                    {allReady ? (
                        <>
                            <div className="text-6xl animate-bounce">✓</div>
                            <h2 className="text-3xl font-bold text-gray-800">
                                Everyone's ready! Starting soon...
                            </h2>
                        </>
                    ) : (
                        <>
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
                            <h2 className="text-3xl font-bold text-gray-800">
                                Waiting for others...
                            </h2>
                            <p className="text-gray-600">
                                {readyCount} of {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} ready
                            </p>
                        </>
                    )}
                </div>

                <div className="space-y-3 max-w-md mx-auto">
                    {sortedPlayers.map(player => (
                        <PlayerStatusCard
                            key={player.id}
                            player={player}
                            isChecked={roundData.readyPlayers.has(player.id)}
                            isCurrentUser={player.id === localState.player.id}
                        />
                    ))}
                </div>

                {!allReady && (
                    <p className="text-center text-sm text-gray-500">
                        Hang tight! The game will start once everyone is ready.
                    </p>
                )}
            </div>
        </GameLayout>
    )
}
