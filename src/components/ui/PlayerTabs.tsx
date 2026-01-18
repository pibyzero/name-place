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
                            px-4 py-2 rounded-full font-medium transition-all border
                            ${isActive
                                ? 'bg-coral text-white border-coral scale-105'
                                : 'bg-white bg-opacity-60 text-charcoal hover:bg-white hover:bg-opacity-80 border-gray-300'
                            }
                        `}
                    >
                        {player.name}
                        {showStatus && hasSubmitted && (
                            <span className="ml-2">✓</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}