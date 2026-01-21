import { useCallback, useState } from "react"
import { Player } from "../types/game"
import Peer from "peerjs";

export function useP2P() {
    const [player, setPlayer] = useState<Player | undefined>();

    const initialize = useCallback((id: string, name: string, seedPeer: string | undefined) => {
        if (isInitialized()) {
            return
        }
        const peer = createPeer(id); // TODO: handle error when this fails
        peer.on('open', (id) => {
            console.log('Peer initialized:', id);
            const player = {
                id,
                name,
                isHost: seedPeer === undefined,
            }
            setPlayer(player)
        });
    }, [])

    const isInitialized = useCallback(() => player !== undefined, [player])

    return {
        isInitialized,
        initialize,
    }
}

function createPeer(id: string) {
    const peer = new Peer(id, {
        config: {
            iceServers: [
                { urls: 'stun:stun.relay.metered.ca:80' },
                {
                    urls: 'turn:global.relay.metered.ca:80',
                    username: '1b6bf3d10c59125af303d465',
                    credential: 'H9EaxlQ4CaKIzTjg'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                    username: '1b6bf3d10c59125af303d465',
                    credential: 'H9EaxlQ4CaKIzTjg'
                },
                {
                    urls: 'turn:global.relay.metered.ca:443?transport=tcp',
                    username: '1b6bf3d10c59125af303d465',
                    credential: 'H9EaxlQ4CaKIzTjg'
                },
                {
                    urls: 'turn:global.relay.metered.ca:443',
                    username: '1b6bf3d10c59125af303d465',
                    credential: 'H9EaxlQ4CaKIzTjg'
                },
            ],
            iceTransportPolicy: 'all'
        },
        debug: 2
    })
    return peer
}
