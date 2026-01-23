import { FC } from "react";

export const PlayerStatusCard: FC<{
    player: { id: string; name: string; isHost?: boolean }
    isChecked: boolean
    isCurrentUser: boolean
}> = ({ player, isChecked, isCurrentUser }) => (
    <div
        className={`
            relative p-4 rounded-lg border-2 transition-all
            ${isChecked
                ? 'bg-green-50 border-green-400'
                : 'bg-white bg-opacity-40 border-gray-300'
            }
        `}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
                <p className={`font-semibold ${isChecked ? 'text-green-800' : 'text-gray-700'}`}>
                    {player.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-coral">(You)</span>}
                    {player.isHost && <span className="ml-2 text-xs text-purple-600">★ Host</span>}
                </p>
            </div>
            <div className="flex-shrink-0">
                {isChecked ? (
                    <span className="text-2xl">✓</span>
                ) : (
                    <span className="text-gray-400 text-xl animate-pulse">○</span>
                )}
            </div>
        </div>
    </div>
)

