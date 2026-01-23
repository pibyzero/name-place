import { FC, useCallback, useMemo } from 'react'
import { getAlphabet } from '../../utils/constants'
import { GameState, LocalState } from '../../types/game'
import { GameLayout } from '../ui/GameLayout'
import { Button } from '../ui/Button'

interface LetterSelectionProps {
    localState: LocalState
    onSelectLetter: (letter: string) => void
    currentRound: number
    gameState: GameState
}

export const LetterSelection: FC<LetterSelectionProps> = ({
    localState,
    onSelectLetter,
    currentRound,
    gameState
}) => {
    let roundData = gameState.roundData;
    const isUsed = useCallback((letter: string) => {
        return gameState.allRounds.map(r => r.letter?.toLowerCase()).includes(letter.toLowerCase())
    }, [gameState])

    if (!roundData) {
        return (
            <GameLayout centerVertically>
                <div className="text-center text-gray-600">
                    Something went wrong, game not in correct state (there is no data for this round).
                </div>
            </GameLayout>
        )
    }

    let isMyTurn = gameState.players.some((p, i) => p.id == localState.player.id && i == roundData.turnPlayerIndex);
    let alphabet = useMemo(() => {
        return getAlphabet(gameState.config.language)
    }, [gameState])

    if (!isMyTurn) {
        const turnPlayer = gameState.players[roundData.turnPlayerIndex];
        return (
            <GameLayout centerVertically>
                <div className="text-center">
                    <p> Round {gameState.currentRound} </p>
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral mb-4"></div>
                    <p className="text-lg text-gray-700">
                        Waiting for <span className="font-semibold text-coral">{turnPlayer?.name || `player ${roundData.turnPlayerIndex}`}</span> to choose a letter...
                    </p>
                </div>
            </GameLayout>
        )
    }

    return (
        <GameLayout
            header={
                <div className="text-center">
                    <p className="text-sm text-gray-600 uppercase tracking-wide">
                        Round {currentRound}
                    </p>
                </div>
            }
            centerVertically
        >
            <div className="w-full space-y-8">
                <h2 className="text-3xl font-bold text-center">
                    Choose a letter. It's your turn!
                </h2>
                <div className="grid grid-cols-6 md:grid-cols-7 gap-3 p-6 bg-white bg-opacity-40 rounded-xl">
                    {alphabet.map((letter) => (
                        <Button
                            key={letter}
                            onClick={() => onSelectLetter(letter)}
                            className="aspect-square flex items-center justify-center text-5xl font-bold bg-coral hover:bg-opacity-80 hover:text-white hover:scale-110 rounded-md border border-gray-200"
                            disabled={isUsed(letter)}
                        >
                            {letter}
                        </Button>
                    ))}
                </div>
            </div>
        </GameLayout>
    )
}
