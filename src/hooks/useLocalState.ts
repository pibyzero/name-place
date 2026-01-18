import { useCallback, useState } from 'react';
import { LocalState, Player } from '../types/game'

const localInitialState: LocalState = {
    player: { name: '', id: '' },
    roomName: '',
    screen: 'home',
    peers: [],
}

export const useLocalState = () => {
    const [localState, setLocalState] = useState(localInitialState);

    const addPeer = useCallback((peerId: string) => {
        setLocalState(prev => ({ ...prev, peers: [...prev.peers, peerId] }))
    }, [])

    const setRoomName = useCallback((roomName: string) => {
        setLocalState(prev => ({ ...prev, roomName }))
    }, [])

    const setPlayer = useCallback((player: Player) => {
        setLocalState(prev => ({ ...prev, player }))
    }, [])

    const setPlayerId = useCallback((id: string) => {
        setLocalState(prev => ({ ...prev, player: { ...prev.player, id } }))
    }, [])

    return {
        localState,
        actions: {
            addPeer,
            setRoomName,
            setPlayer,
            setPlayerId,
        }
    }
}
