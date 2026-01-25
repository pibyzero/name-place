import { FC, useCallback, useMemo } from 'react'
import { getAlphabet } from '../../utils/constants'
import { GameState, LocalState } from '../../types/game'
import { GameLayout } from '../ui/GameLayout'
import { Button } from '../ui/Button'

interface LetterSelectionProps {
    localState: LocalState
    onSelectLetter: (letter: string) => void
    gameState: GameState
}

export const LetterSelection: FC<LetterSelectionProps> = ({
    localState,
    onSelectLetter,
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
        const usedLetters = gameState.allRounds.map(r => r.letter).filter(Boolean);
        return (
            <GameLayout centerVertically>
                <div className="w-full space-y-8">
                    <div className="bg-white bg-opacity-40 rounded-xl p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-coral mb-6"></div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            Letter Selection in Progress
                        </h3>
                        <p className="text-lg text-gray-700">
                            <span className="font-bold text-coral">{turnPlayer?.name || `Player ${roundData.turnPlayerIndex + 1}`}</span> is choosing a letter
                        </p>
                    </div>

                    {usedLetters.length > 0 && (
                        <div className="bg-white bg-opacity-40 rounded-xl p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                                Letters Used So Far
                            </h4>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {usedLetters.map((letter, idx) => (
                                    <div
                                        key={idx}
                                        className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-600 font-bold rounded-lg"
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </GameLayout>
        )
    }

    return (
        <GameLayout centerVertically>
            <div className="w-full space-y-8">
                <h2 className="text-3xl font-bold text-center">
                    Choose a letter. It's your turn!
                </h2>
                <div className="grid grid-cols-6 md:grid-cols-7 gap-3 p-6 bg-white bg-opacity-40 rounded-xl">
                    {alphabet.map((letter) => (
                        <Button
                            key={letter}
                            onClick={() => onSelectLetter(letter)}
                            className="aspect-square flex items-center justify-center text-4xl font-bold hover:scale-105 transition-all duration-200"
                            disabled={isUsed(letter)}
                            variant="primary"
                        >
                            {letter}
                        </Button>
                    ))}
                </div>
            </div>
        </GameLayout>
    )
}
