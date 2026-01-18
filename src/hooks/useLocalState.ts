import { useCallback, useState } from 'react';
import { LocalState } from '../types/game'

const localInitialState: LocalState = {
    roomName: '',
    screen: 'home',
    playerId: '', // also called peer id
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

    const setPlayerId = useCallback((playerId: string) => {
        setLocalState(prev => ({ ...prev, playerId }))
    }, [])

    return {
        localState,
        actions: {
            addPeer,
            setRoomName,
            setPlayerId,
        }
    }
}
