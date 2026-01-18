import { FC, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface HomeProps {
    onStart: (playerName: string) => void
}

export const Home: FC<HomeProps> = ({ onStart }) => {
    const [playerName, setPlayerName] = useState('')

    const handleStart = () => {
        if (playerName.trim()) {
            onStart(playerName.trim())
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2 text-coral">
                        Name Place
                    </h1>
                    <h2 className="text-3xl font-bold text-teal">
                        Animal ...
                    </h2>
                </div>

                <div className="space-y-6">
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
                        Start Game
                    </Button>
                </div>
            </div>
        </div>
    )
}
