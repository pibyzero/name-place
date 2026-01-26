import { FC, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { GameLayout } from '../ui/GameLayout';
import { GameConfig, Language } from '../../types/game';
import { parseRoomCode } from '../../utils/p2p';


interface HomeProps {
    onInit: (playerName: string, config: GameConfig) => void
    roomName: string | undefined;
}

export const Home: FC<HomeProps> = ({ onInit: onStart, roomName }) => {
    const [playerName, setPlayerName] = useState('')
    const [isLoading, setIsLoading] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [roomCodeError, setRoomCodeError] = useState('');

    const [showConfig, setShowConfig] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [numRounds, setNumRounds] = useState(5);
    const [language, setLanguage] = useState<Language>('english');

    const handleStart = () => {
        let trimmed = playerName.trim()
        if (isLoading || !trimmed) return;

        // If room code is entered, validate and parse it
        if (roomCode.trim() && !roomName) {
            const parsed = parseRoomCode(roomCode.trim());
            if (!parsed) {
                setRoomCodeError('Invalid room code format');
                return;
            }

            // Update the URL without reloading
            window.location.hash = `#room/${parsed.roomName}?seed-peer=${parsed.seedPeer}`;

            setIsLoading(true);
            const config: GameConfig = { maxPlayers, language, numRounds }

            // Directly call onStart - the app.tsx will pick up the seed peer from URL
            onStart(trimmed, config);
            return;
        }

        setIsLoading(true);
        const config: GameConfig = { maxPlayers, language, numRounds }
        onStart(trimmed, config);
        // Keep loading state true until navigation happens
    }

    return (
        <GameLayout maxWidth="sm" centerVertically>
            <div className="w-full space-y-8">
                {/* Title */}
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2 text-coral">Name Place</h1>
                    <h2 className="text-3xl font-bold text-teal">Animal Thing</h2>
                    <p className="mt-4 text-gray-600 text-sm">The classic word game with friends</p>
                </div>
                {/* Form Card */}
                <div className="space-y-4 bg-white bg-opacity-40 rounded-xl p-6">
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

                    {!roomName && (
                        <>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 h-px bg-gray-300"></div>
                                    <span className="text-xs uppercase tracking-wider text-gray-500">OR</span>
                                    <div className="flex-1 h-px bg-gray-300"></div>
                                </div>
                                <Input
                                    label="Have a room code?"
                                    type="text"
                                    placeholder="e.g. happy-tiger-a3f2"
                                    value={roomCode}
                                    onChange={(e) => {
                                        setRoomCode(e.target.value);
                                        setRoomCodeError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                                />
                                {roomCodeError && (
                                    <p className="text-sm text-red-500 mt-1">{roomCodeError}</p>
                                )}
                            </div>
                        </>
                    )}

                    {!roomName && !roomCode && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowConfig(!showConfig)}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal font-medium mb-2 focus:outline-none"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                                Game Settings
                            </button>

                            {showConfig && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-white bg-opacity-60 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Input
                                        label="Max Players"
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={maxPlayers}
                                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                                    />

                                    <Input
                                        label="Total Rounds"
                                        type="number"
                                        min={2}
                                        max={10}
                                        value={numRounds}
                                        onChange={(e) => setNumRounds(Number(e.target.value))}
                                    />


                                    {/* Manual styling for Select to match existing Input style */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Language
                                        </label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as Language)}
                                            className="w-full px-4 py-2 bg-white bg-opacity-80 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral transition-all"
                                        >
                                            <option value="english">English</option>
                                            <option value="nepali">Nepali</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={handleStart}
                        disabled={!playerName.trim()}
                        className="w-full"
                        size="large"
                        isLoading={isLoading}
                    >
                        {roomName ? "Join Game" : roomCode ? "Join with Room Code" : "Create a New Game"}
                    </Button>
                </div>
                {/* Instructions */}
                {!roomName && (
                    <div className="text-center space-y-4 text-sm text-gray-600">
                        <p className="font-semibold text-gray-700">How to play:</p>
                        <p>Create a game to get a shareable link for your friends</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-gray-400">—</span>
                            <span className="text-xs uppercase tracking-wider text-gray-500">OR</span>
                            <span className="text-gray-400">—</span>
                        </div>
                        <p>Use a link from a friend to join their game</p>
                    </div>
                )}
            </div>
        </GameLayout>
    )
}
