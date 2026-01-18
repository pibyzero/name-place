import { FC, useState } from 'react'
import { Player } from '../../types/game'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface PlayerSetupProps {
    onStartGame: (players: Player[], mode: 'classic' | 'timer') => void
}

export const PlayerSetup: FC<PlayerSetupProps> = ({ onStartGame }) => {
    const [players, setPlayers] = useState<Player[]>([])
    const [newPlayerName, setNewPlayerName] = useState('')
    const [gameMode, setGameMode] = useState<'classic' | 'timer'>('timer')

    const addPlayer = () => {
        if (newPlayerName.trim() && players.length < 8) {
            const newPlayer: Player = {
                id: Date.now().toString(),
                name: newPlayerName.trim(),
                isHost: players.length === 0
            }
            setPlayers([...players, newPlayer])
            setNewPlayerName('')
        }
    }

    const removePlayer = (id: string) => {
        const updatedPlayers = players.filter(p => p.id !== id)
        // Reassign host if needed
        if (updatedPlayers.length > 0 && !updatedPlayers.some(p => p.isHost)) {
            updatedPlayers[0].isHost = true
        }
        setPlayers(updatedPlayers)
    }

    const canStartGame = players.length >= 2

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="text-coral">Name Place</span>{' '}
                        <span className="text-teal">Animal ...</span>
                    </h1>
                    <p className="text-lg text-gray-600">Add 2-8 players to start</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Game Mode Selection */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Game Mode</h3>
                        <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    className="mr-2"
                                    checked={gameMode === 'timer'}
                                    onChange={() => setGameMode('timer')}
                                />
                                <span className="font-medium">Timer Mode</span>
                                <span className="text-sm text-gray-500 ml-2">(60 seconds)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    className="mr-2"
                                    checked={gameMode === 'classic'}
                                    onChange={() => setGameMode('classic')}
                                />
                                <span className="font-medium">Classic Mode</span>
                                <span className="text-sm text-gray-500 ml-2">(First to stop)</span>
                            </label>
                        </div>
                    </div>

                    {/* Players List */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">
                            Players ({players.length}/8)
                        </h3>
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-3 bg-cream rounded-lg"
                                >
                                    <div className="flex items-center">
                                        <span className="font-medium">
                                            Player {index + 1}: {player.name}
                                        </span>
                                        {player.isHost && (
                                            <span className="ml-2 text-xs bg-coral text-white px-2 py-1 rounded">
                                                Host
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removePlayer(player.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Player Input */}
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Enter player name"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                                disabled={players.length >= 8}
                                className="flex-1"
                            />
                            <Button
                                onClick={addPlayer}
                                disabled={!newPlayerName.trim() || players.length >= 8}
                            >
                                Add Player
                            </Button>
                        </div>
                    </div>

                    {/* Start Game Button */}
                    <Button
                        onClick={() => onStartGame(players, gameMode)}
                        disabled={!canStartGame}
                        size="large"
                        className="w-full"
                    >
                        {canStartGame
                            ? `Start Game with ${players.length} Players`
                            : 'Add at least 2 players to start'}
                    </Button>
                </div>
            </div>
        </div>
    )
}