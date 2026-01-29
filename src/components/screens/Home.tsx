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
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

    const [showConfig, setShowConfig] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [numRounds, setNumRounds] = useState(5);
    const [language, setLanguage] = useState<Language>('english');

    const handleStart = () => {
        let trimmed = playerName.trim()
        if (isLoading || !trimmed) return;

        // Handle join tab - room code is required
        if (activeTab === 'join' && !roomName) {
            if (!roomCode.trim()) {
                setRoomCodeError('Please enter a room code');
                return;
            }

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

        // Handle create tab or joining with roomName from URL
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
                <div className="bg-white bg-opacity-40 rounded-xl">
                    {/* Show joining state if roomName is in URL */}
                    {roomName ? (
                        <div className="p-6 space-y-4">
                            <div className="text-center p-3 bg-teal bg-opacity-20 rounded-lg">
                                <p className="text-gray-700 font-medium">
                                    Joining game: <span className="font-bold text-teal">{roomName}</span>
                                </p>
                            </div>
                            <Input
                                label="Enter your name to join"
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
                                Join Game
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Tab buttons */}
                            <div className="flex rounded-t-xl overflow-hidden bg-gray-100 bg-opacity-30">
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`flex-1 py-3 px-4 font-medium transition-all duration-200 cursor-pointer border-r border-gray-200 border-opacity-50 ${
                                        activeTab === 'create'
                                            ? 'text-white bg-teal shadow-inner relative'
                                            : 'text-gray-700 hover:bg-white hover:bg-opacity-40 hover:text-teal active:bg-opacity-60'
                                    }`}
                                >
                                    Create New Game
                                    {activeTab === 'create' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white opacity-50"></div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('join')}
                                    className={`flex-1 py-3 px-4 font-medium transition-all duration-200 cursor-pointer ${
                                        activeTab === 'join'
                                            ? 'text-white bg-teal shadow-inner relative'
                                            : 'text-gray-700 hover:bg-white hover:bg-opacity-40 hover:text-teal active:bg-opacity-60'
                                    }`}
                                >
                                    Join Existing Game
                                    {activeTab === 'join' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white opacity-50"></div>
                                    )}
                                </button>
                            </div>

                            {/* Tab content */}
                            <div className="p-6 space-y-4">
                                {activeTab === 'create' ? (
                                    <>
                                        <div className="text-center text-sm text-gray-600 mb-4">
                                            Start a new game and invite your friends
                                        </div>
                                        <Input
                                            label="Your name"
                                            type="text"
                                            placeholder="Enter your name"
                                            value={playerName}
                                            onChange={(e) => setPlayerName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                                            autoFocus
                                        />

                                        {/* Game settings for create mode */}
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
                                                Game Settings (Optional)
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

                                        <Button
                                            onClick={handleStart}
                                            disabled={!playerName.trim()}
                                            className="w-full"
                                            size="large"
                                            isLoading={isLoading}
                                        >
                                            Create Game & Get Link
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {/* Join tab content */}
                                        <div className="text-center text-sm text-gray-600 mb-4">
                                            Enter the room code shared by your friend
                                        </div>
                                        <Input
                                            label="Your name"
                                            type="text"
                                            placeholder="Enter your name"
                                            value={playerName}
                                            onChange={(e) => setPlayerName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && roomCode.trim() && handleStart()}
                                        />
                                        <Input
                                            label="Room code"
                                            type="text"
                                            placeholder="e.g. happy-tiger-a3f2"
                                            value={roomCode}
                                            onChange={(e) => {
                                                setRoomCode(e.target.value);
                                                setRoomCodeError('');
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleStart()}
                                            autoFocus={activeTab === 'join'}
                                        />
                                        {roomCodeError && (
                                            <p className="text-sm text-red-500 mt-1">{roomCodeError}</p>
                                        )}
                                        <Button
                                            onClick={handleStart}
                                            disabled={!playerName.trim() || !roomCode.trim()}
                                            className="w-full"
                                            size="large"
                                            isLoading={isLoading}
                                        >
                                            Join Game
                                        </Button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
                {/* Instructions */}
                {!roomName && (
                    <div className="text-center space-y-2 text-sm text-gray-600">
                        <p className="font-semibold text-gray-700">How to play:</p>
                        {activeTab === 'create' ? (
                            <>
                                <p>1. Enter your name and click "Create Game"</p>
                                <p>2. Share the generated link or room code with friends</p>
                                <p>3. Wait for players to join, then start playing!</p>
                            </>
                        ) : (
                            <>
                                <p>1. Get the room code from your friend</p>
                                <p>2. Enter your name and the room code</p>
                                <p>3. Click "Join Game" to enter the room</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </GameLayout>
    )
}
