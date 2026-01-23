import { FC } from 'react'
import { GameState, LocalState } from '../../types/game'
import { GameLayout } from '../ui/GameLayout'
import { Button } from '../ui/Button'


interface ReadinessCheckProps {
    localState: LocalState
    gameState: GameState
    onReady: () => void
}

export const CheckReadiness: FC<ReadinessCheckProps> = ({
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
                    <div className="text-center space-y-3">
                        <h2 className="text-4xl font-bold text-gray-800">
                            Ready for round {gameState.roundData?.roundNumber} ?
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
                                isReady={roundData.readyPlayers.has(player.id)}
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
                            isReady={roundData.readyPlayers.has(player.id)}
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

const PlayerStatusCard: FC<{
    player: { id: string; name: string; isHost?: boolean }
    isReady: boolean
    isCurrentUser: boolean
}> = ({ player, isReady, isCurrentUser }) => (
    <div
        className={`
            relative p-4 rounded-lg border-2 transition-all
            ${isReady
                ? 'bg-green-50 border-green-400'
                : 'bg-white bg-opacity-40 border-gray-300'
            }
            ${isCurrentUser ? 'ring-2 ring-coral ring-offset-2' : ''}
        `}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
                <p className={`font-semibold ${isReady ? 'text-green-800' : 'text-gray-700'}`}>
                    {player.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-coral">(You)</span>}
                    {player.isHost && <span className="ml-2 text-xs text-purple-600">★ Host</span>}
                </p>
            </div>
            <div className="flex-shrink-0">
                {isReady ? (
                    <span className="text-2xl">✓</span>
                ) : (
                    <span className="text-gray-400 text-xl animate-pulse">○</span>
                )}
            </div>
        </div>
    </div>
)

