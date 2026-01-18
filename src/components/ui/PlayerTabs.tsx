import { FC } from 'react'
import { Player } from '../../types/game'

interface PlayerTabsProps {
    players: Player[]
    currentPlayerId: string
    onSelectPlayer: (playerId: string) => void
    showStatus?: boolean
    submittedPlayers?: Set<string>
}

export const PlayerTabs: FC<PlayerTabsProps> = ({
    players,
    currentPlayerId,
    onSelectPlayer,
    showStatus = false,
    submittedPlayers = new Set()
}) => {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            {players.map(player => {
                const isActive = player.id === currentPlayerId
                const hasSubmitted = submittedPlayers.has(player.id)

                return (
                    <button
                        key={player.id}
                        onClick={() => onSelectPlayer(player.id)}
                        className={`
                            px-4 py-2 rounded-lg font-medium transition-all
                            ${isActive
                                ? 'bg-coral text-white shadow-md scale-105'
                                : 'bg-white text-charcoal hover:bg-gray-100 shadow'
                            }
                        `}
                    >
                        {player.name}
                        {showStatus && hasSubmitted && (
                            <span className="ml-2 text-green-500">✓</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}