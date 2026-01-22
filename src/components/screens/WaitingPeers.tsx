import { FC, useState, useMemo } from "react";
import { GameState, LocalState, Player } from "../../types/game";
import { createURL } from "../../utils/p2p";
import { Button } from "../ui/Button";
import { GameLayout } from "../ui/GameLayout";

interface WaitingPeersProps {
    localState: LocalState
    gameState: GameState
    onStartGame: () => void
}

const MIN_PLAYERS = 2;

export const WaitingPeers: FC<WaitingPeersProps> = ({ localState, gameState, onStartGame }) => {
    const [copied, setCopied] = useState(false);

    // Generate the URL once
    const url = useMemo(() => createURL(localState.roomName, localState.player.id), [localState]);

    // Dummy list of connected peers
    const connectedPeers = gameState.players.map(x => `${x.name} - ${x.id}`);
    const me = gameState.players.filter(x => x.id == localState.player.id)[0];

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    const preText = (peer: Player) => {
        if (peer.id == me.id && peer.isHost) return "(You)[Host]"
        if (peer.id == me.id) return "(You)"
        if (peer.isHost) return ("[Host]")
        return ""
    }

    return (
        <GameLayout maxWidth="md" centerVertically>
            <div className="w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-coral mb-2">
                        Waiting for Players
                    </h1>
                    {me.isHost ? (
                        <p className="text-gray-600">
                            Share the link below with your friends to join the game
                        </p>
                    ) : (
                        <p className="text-gray-600">
                            Let the host start the game once enough players join
                        </p>
                    )}
                </div>

                {/* URL Section */}
                {me.isHost && (
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
                )}

                {/* Connected Peers Section */}
                <div className="bg-white bg-opacity-40 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-700">
                        Connected Players ({gameState.players.length})
                    </h2>
                    <div className="space-y-2">
                        {gameState.players.map((peer, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-white bg-opacity-60 rounded-lg"
                            >
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-gray-700 font-medium">
                                    {preText(peer)} {peer.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Start Game Button */}
                {localState.player.isHost && (
                    <div className="text-center">
                        <Button
                            size="large"
                            disabled={connectedPeers.length < MIN_PLAYERS}
                            className="min-w-[200px]"
                            onClick={onStartGame}
                        >
                            Start Game ({connectedPeers.length} players)
                        </Button>
                        {connectedPeers.length < MIN_PLAYERS && (
                            <p className="text-sm text-gray-500 mt-2">
                                Need at least {MIN_PLAYERS} players to start
                            </p>
                        )}
                    </div>
                )}
            </div>
        </GameLayout>
    )
}
