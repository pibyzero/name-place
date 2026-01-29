import { FC, useCallback } from 'react'
import { GameState, LocalState } from '../../types/game'
import { Button } from './Button'

interface GameStatusBarProps {
    gameState: GameState | null
    localState: LocalState | null
}

// Simple exit icon component
const ExitIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)

export const GameStatusBar: FC<GameStatusBarProps> = ({ gameState, localState }) => {
    if (!gameState || !localState || gameState.status === 'uninitialized') {
        return null
    }

    const handleExitGame = useCallback(() => {
        // Same logic as leaderboard: reload for host, go to home for guest
        if (localState.player.isHost) {
            window.location.reload()
        } else {
            window.location.href = window.location.href.split('#')[0]
        }
    }, [localState])

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
                    <div className="flex items-center gap-2 md:hidden flex-1">
                        <span className="font-semibold text-gray-700">{localState.player.name}</span>
                        {currentRound > 0 && (
                            <span className="text-gray-600">
                                R {currentRound}/{totalRounds}
                            </span>
                        )}
                        <span className="text-coral font-medium">{statusText}</span>
                        <span className="text-teal font-bold">{localState?.roomName}</span>
                    </div>

                    {/* Mobile exit button */}
                    <div className="md:hidden">
                        <Button
                            onClick={handleExitGame}
                            size="small"
                            variant="ghost"
                            className="p-1.5"
                            title={localState.player.isHost ? "Start New Game" : "Exit to Home"}
                        >
                            <ExitIcon className="h-4 w-4 text-coral opacity-60 hover:opacity-100" />
                        </Button>
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
                        <div className="hidden md:block">
                            <span className="px-3 py-1 bg-coral bg-opacity-10 text-coral font-semibold rounded-full text-xs uppercase tracking-wide">
                                {statusText}
                            </span>
                        </div>
                        {gameState.roundData?.letter && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Letter:</span>
                                <span className="font-bold text-coral text-lg">
                                    {gameState.roundData.letter}
                                </span>
                            </div>
                        )}
                    </div>
                    {localState?.roomName && (
                        <div className="hidden md:flex items-center gap-3">
                            <span className="text-teal font-semibold">{localState.roomName}</span>
                            <Button
                                onClick={handleExitGame}
                                size="small"
                                variant="ghost"
                                className="flex items-center gap-1.5 px-2 py-1 text-coral opacity-70 hover:opacity-100 transition-opacity"
                                title={localState.player.isHost ? "Start New Game" : "Exit to Home"}
                            >
                                <ExitIcon className="h-4 w-4" />
                                <span className="text-xs font-medium">Exit</span>
                            </Button>
                        </div>
                    )}


                </div>
            </div>
        </div>
    )
}
