import Peer, { DataConnection } from "peerjs";
import { GameState, Player } from "../types/game";

export function getSeedPeerFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/seed-peer=([^&]+)/);
    return match ? match[1] : null;
}

export function createURL(roomName: string, seedPeer: string) {
    const url = `${window.location.origin}${window.location.pathname}#room/${roomName}?seed-peer=${seedPeer}`;
    return url
}

export class PeerInitializer {
    name: string
    id: string
    playerSetter: (p: Player) => void

    constructor() {
        this.name = ''
        this.id = ''
        this.playerSetter = (_) => { }
    }

    withName(name: string) {
        this.name = name
        return this
    }

    withId(id: string) {
        this.id = id
        return this
    }

    withPlayerSetter(s: (_: Player) => void) {
        this.playerSetter = s
        return this
    }

    initialize(gameState: GameState, seedPeer: string | null, existingPeers: string[]) {
        const player = { name: this.name, id: this.id };
        initializePeer(player, gameState, seedPeer, this.playerSetter, existingPeers)
    }
}

function initializePeer(
    player: Player,
    gameState: GameState,
    seedPeer: string | null,
    setPlayer: any,
    existingPeers: string[]
) {
    const peer = new Peer(player.id, {
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

    peer.on('connection', (conn) => {
        console.warn("received connection")
        console.log('[INCOMING] Got connection from:', conn.peer)

        conn.on('open', () => {
            console.log('[INCOMING] Connection opened with:', conn.peer)
        })

        conn.on('data', (data) => {
            console.log('[INCOMING] Data from:', conn.peer, data)
        })
    })

    peer.on('open', (id) => {
        console.log('Peer initialized:', id);
        const updated = { name: player.name, id }
        setPlayer(updated)

        if (seedPeer && seedPeer !== id) {
            console.log('Connecting to seed:', seedPeer);
            const conn = peer.connect(seedPeer);
            // Set up connection if not connected already
            if (!existingPeers.includes(seedPeer)) {
                console.warn("setting up connection with seed")
                setupConnection(conn, updated, existingPeers, gameState, id);
            }
        }
    });

}

function setupConnection(conn: DataConnection, player: Player, existingPeers: string[], gameState: GameState, id: string) {
    console.log('[DEBUG] Setting up connection with:', conn.peer);

    conn.on('open', () => {
        console.log('[SUCCESS] Connection established with:', conn.peer);

        // Send handshake message
        conn.send({
            type: 'handshake',
            player: { name: player.name, id }
        });
        console.log('[DEBUG] Sent handshake msg to:', conn.peer);

        // Send list of all known peers
        conn.send({
            type: 'peer-list',
            peers: Array.from(existingPeers).filter(p => p !== conn.peer)
        });
        console.log('[DEBUG] Sent peer list to:', conn.peer);
        console.warn("type of game state", typeof gameState);

        // Send game state
        conn.send({
            type: 'sync',
            state: {} // TODO: send state
        });
        console.log('[DEBUG] Sent sync state to:', conn.peer);

    });

    conn.on('data', (data) => {
        console.log('[DEBUG] Received data from', conn.peer, ':', data.type);
        handleIncomingData(data);
    });

    conn.on('close', () => {
        console.log('[DEBUG] Connection closed with:', conn.peer);
        // TODO: cleanup?
    });

    conn.on('error', (err) => {
        console.error('[ERROR] Connection error with', conn.peer, ':', err);
    });

    // Log ICE connection state changes
    if (conn.peerConnection) {
        conn.peerConnection.oniceconnectionstatechange = () => {
            console.log('[ICE] State changed to:', conn.peerConnection.iceConnectionState);
        };
    }
}

function handleIncomingData(data: unknown) {
    console.warn("received", { data })
    throw new Error("Function not implemented.");
}
