import Peer, { DataConnection } from "peerjs";
import { GameState, Player } from "../types/game";
import { GameActions } from "../hooks/useGameState";

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
    gameActions: GameActions | undefined

    constructor() {
        this.name = ''
        this.id = ''
        this.playerSetter = (_) => { }
        this.gameActions = undefined
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

    withGameActions(g: GameActions) {
        this.gameActions = g
        return this
    }

    initialize(gameState: GameState, seedPeer: string | null, existingPeers: string[]) {
        const isHost = seedPeer === null;
        const player = { name: this.name, id: this.id, isHost };
        if (this.gameActions === undefined) {
            console.error("No game actions set")
            return
        }
        initializePeer(player, gameState, seedPeer, this.playerSetter, existingPeers, this.gameActions)
    }
}

function initializePeer(
    player: Player,
    gameState: GameState,
    seedPeer: string | null,
    setPlayer: any,
    existingPeers: string[],
    gameActions: GameActions,
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
            handleIncomingData(data as PeerData, gameActions);
        })

        let p = conn.peer;
        if (!existingPeers.includes(p)) {
            console.warn("setting up connection with seed")
            const me = { ...player, name: player.name, id: peer.id }
            setupConnection(conn, me, existingPeers, gameState, gameActions);
        }

    })

    peer.on('open', (id) => {
        console.log('Peer initialized:', id);
        const me = { ...player, name: player.name, id }

        setPlayer(me)
        gameActions.initGame(me, 'classic')
        gameActions.addPlayer(me)

        // connect with seed if any
        if (seedPeer && seedPeer !== id) {
            console.log('Connecting to seed:', seedPeer);
            const conn = peer.connect(seedPeer);
            // Set up connection if not connected already
            if (!existingPeers.includes(seedPeer)) {
                setupConnection(conn, me, existingPeers, gameState, gameActions);
            }
        }
    });

}

function setupConnection(conn: DataConnection, player: Player, existingPeers: string[], gameState: GameState, gameActions: GameActions) {
    console.log('[DEBUG] Setting up connection with:', conn.peer);

    conn.on('open', () => {
        console.log('[SUCCESS] Connection established with:', conn.peer);

        // Send handshake message
        conn.send({
            type: 'handshake',
            player
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
        handleIncomingData(data, gameActions);
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

interface PeerData {
    type: 'handshake' | 'peer-list' | 'sync'
}

interface HandshakeData {
    type: 'handshake'
    player: Player
}

function handleIncomingData(data: PeerData, gameActions: GameActions) {
    switch (data.type) {
        case 'handshake':
            const { player } = data as HandshakeData;
            gameActions.addPlayer(player);
            break;
        case 'sync':
            console.warn("SYNC")
            break;

        case 'peer-list':
            console.warn("PEERLIST")
            break;

        default:
            break;
    }
    console.warn("received", { data })
}
