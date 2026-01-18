import { FC, useState, useMemo } from "react";
import { LocalState } from "../../types/game";
import { createURL } from "../../peer";
import { Button } from "../ui/Button";

interface WaitingPeersProps {
    localState: LocalState
}

export const WaitingPeers: FC<WaitingPeersProps> = ({ localState }) => {
    const [copied, setCopied] = useState(false);

    // Generate the URL once
    const url = useMemo(() => createURL(localState.roomName, localState.playerId), [localState]);

    // Dummy list of connected peers
    const connectedPeers = [
        "Player 1",
        "John Doe",
        "Alice",
        "Bob"
    ];

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
            <div className="max-w-2xl w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-coral mb-2">
                        Waiting for Players
                    </h1>
                    <p className="text-gray-600">
                        Share the link below with your friends to join the game
                    </p>
                </div>

                {/* URL Section */}
                <div className="bg-white bg-opacity-40 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-700">
                        Game Room URL
                    </h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            readOnly
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white bg-opacity-80 text-sm font-mono"
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                            onClick={handleCopyUrl}
                            className="whitespace-nowrap"
                        >
                            {copied ? '✓ Copied!' : 'Copy URL'}
                        </Button>
                    </div>
                </div>

                {/* Connected Peers Section */}
                <div className="bg-white bg-opacity-40 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-700">
                        Connected Peers ({connectedPeers.length})
                    </h2>
                    <div className="space-y-2">
                        {connectedPeers.map((peer, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-white bg-opacity-60 rounded-lg"
                            >
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-gray-700 font-medium">{peer}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Start Game Button (placeholder) */}
                <div className="text-center">
                    <Button
                        size="large"
                        disabled={connectedPeers.length < 2}
                        className="min-w-[200px]"
                    >
                        Start Game ({connectedPeers.length} players)
                    </Button>
                    {connectedPeers.length < 2 && (
                        <p className="text-sm text-gray-500 mt-2">
                            Need at least 2 players to start
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
