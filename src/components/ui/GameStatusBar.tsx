import { FC } from 'react'
import { GameState, LocalState } from '../../types/game'

interface GameStatusBarProps {
    gameState: GameState | null
    localState: LocalState | null
}

export const GameStatusBar: FC<GameStatusBarProps> = ({ gameState, localState }) => {
    if (!gameState || !localState || gameState.status === 'uninitialized') {
        return null
    }

    const statusText = {
        'waiting-peers': 'Waiting for Players',
        'waiting-readiness': 'Ready Check',
        'round-ready': 'Selecting Letter',
        'round-started': 'Round in Progress',
        'reviewing': 'Reviewing',
        'ended': 'Game Complete'
    }[gameState.status] || ''

    const currentRound = gameState.currentRound || 0
    const totalRounds = gameState.config?.numRounds || 0
    const playerCount = gameState.players?.length || 0

    return (
        <div className="bg-white bg-opacity-80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-2">
                <div className="flex items-center justify-between text-sm">
                    {/* Mobile: Single line with key info */}
                    <div className="flex items-center gap-4 md:hidden">
                        <span className="font-semibold text-gray-700">{localState.player.name}</span>
                        {currentRound > 0 && (
                            <span className="text-gray-600">
                                R {currentRound}/{totalRounds}
                            </span>
                        )}
                        <span className="text-coral font-medium">{statusText}</span>
                    </div>

                    {/* Desktop: More detailed info */}
                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">Player:</span>
                            <span className="font-semibold text-gray-800">{localState.player.name}</span>
                            {localState.player.isHost && (
                                <span className="px-2 py-0.5 bg-teal bg-opacity-20 text-teal text-xs font-semibold rounded">
                                    HOST
                                </span>
                            )}
                        </div>

                        {gameState.status !== 'waiting-peers' && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Players:</span>
                                <span className="font-semibold text-gray-800">{playerCount}</span>
                            </div>
                        )}

                        {currentRound > 0 && totalRounds > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Round:</span>
                                <span className="font-semibold text-gray-800">
                                    {currentRound} of {totalRounds}
                                </span>
                            </div>
                        )}

                        {gameState.roundData?.letter && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Letter:</span>
                                <span className="font-bold text-coral text-lg">
                                    {gameState.roundData.letter}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block">
                        <span className="px-3 py-1 bg-coral bg-opacity-10 text-coral font-semibold rounded-full text-xs uppercase tracking-wide">
                            {statusText}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
