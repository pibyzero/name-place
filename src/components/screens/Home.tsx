import { FC, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface HomeProps {
    onInit: (playerName: string, roomName: string) => void
}

// Generate a game room name.
function generateRoomName() {
    const adjectives = ['happy', 'sunny', 'cosmic', 'wild', 'bright', 'swift', 'noble', 'misty'];
    const nouns = ['tiger', 'ocean', 'mountain', 'forest', 'river', 'storm', 'eagle'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}`;
}

export const Home: FC<HomeProps> = ({ onInit: onStart }) => {
    const [playerName, setPlayerName] = useState('')

    const handleStart = () => {
        const roomName = generateRoomName();
        if (playerName.trim()) {
            onStart(playerName.trim(), roomName)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2 text-coral">
                        Name Place
                    </h1>
                    <h2 className="text-3xl font-bold text-teal">
                        Animal ...
                    </h2>
                </div>

                <div className="space-y-6 bg-white bg-opacity-40 rounded-xl p-8">
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
                    >
                        Create a Game
                    </Button>
                    <p>
                        When you create a game, you'll get a link to share with your friends and once they join, you can start the game.
                    </p>
                    <h2 className="font-bold text-lg"> Or, </h2>
                    <p>
                        If you want to join a game, open a new tab with the link received from your friend.
                    </p>
                </div>
            </div>
        </div>
    )
}
