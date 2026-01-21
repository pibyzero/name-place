import { FC, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface HomeProps {
    onInit: (playerName: string) => void
    roomName: string | undefined;
}

export const Home: FC<HomeProps> = ({ onInit: onStart, roomName }) => {
    const [playerName, setPlayerName] = useState('')
    const [isLoading, setIsLoading] = useState(false);

    const handleStart = () => {
        let trimmed = playerName.trim()
        if (isLoading || !trimmed) return;

        setIsLoading(true);
        onStart(trimmed);
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
            <div className="max-w-md w-full flex flex-col gap-12">
                {/* Game Title */}
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2 text-coral">
                        Name Place
                    </h1>
                    <h2 className="text-3xl font-bold text-teal">
                        Animal Thing
                    </h2>
                    <p className="mt-4 text-gray-600 text-sm">
                        The classic word game with friends
                    </p>
                </div>

                {/* Main Card */}
                <div className="space-y-6 bg-white bg-opacity-40 rounded-xl p-8">
                    {roomName && (
                        <div className="text-center p-3 bg-teal bg-opacity-20 rounded-lg">
                            <p className="text-gray-700 font-medium">
                                Joining game ID: <span className="font-bold">{roomName}</span>
                            </p>
                        </div>
                    )}

                    <Input
                        label="Enter your name"
                        type="text"
                        placeholder="Your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        autoFocus
                    />

                    <Button
                        onClick={handleStart}
                        disabled={!playerName.trim()}
                        className="w-full"
                        size="large"
                        isLoading={isLoading}
                    >
                        {!roomName ? "Create a New Game" : "Join Game"}
                    </Button>
                </div>

                {/* Instructions - Outside the main card for better separation */}
                {!roomName && (
                    <div className="text-center space-y-4 text-sm text-gray-600">
                        <div className="space-y-2">
                            <p className="font-semibold text-gray-700">How to play:</p>
                            <p>
                                Create a game to get a shareable link for your friends
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-gray-400">—</span>
                                <span className="text-xs uppercase tracking-wider text-gray-500">OR</span>
                                <span className="text-gray-400">—</span>
                            </div>
                            <p>
                                Use a link from a friend to join their game
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


