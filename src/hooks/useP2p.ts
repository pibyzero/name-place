import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Player } from "../types/game"
import Peer, { DataConnection } from "peerjs";

const USE_PROD = false;

// ============================================================================
// TYPES
// ============================================================================

export interface P2PMessage {
    type: 'join-handshake' | 'handshake' | 'peer-list' | 'sync' | 'game-action';
    data: any;
}

export interface JoinHandshakeMessage extends P2PMessage {
    type: 'join-handshake';
    data: Player;
}


export interface HandshakeMessage extends P2PMessage {
    type: 'handshake';
    data: Player;
}

export interface PeerListMessage extends P2PMessage {
    type: 'peer-list';
    data: string[];
}

export interface SyncMessage extends P2PMessage {
    type: 'sync';
    data: any;
}

export interface GameActionMessage extends P2PMessage {
    type: 'game-action';
    data: string;
}

export interface UseP2PProps {
    onPlayerJoined: VoidWithArg<Player>
    onGameAction: VoidWithArg<any>
}

interface P2PPlayer extends Player {
    peer: Peer
}

export function useP2P({ onPlayerJoined, onGameAction }: UseP2PProps) {
    const [player, setPlayer] = useState<P2PPlayer | undefined>();
    const [peers, setPeers] = useState<Record<string, PeerInfo>>({});

    // Use refs to always have latest values in callbacks
    const playerRef = useRef(player);
    const peersRef = useRef(peers);

    useEffect(() => {
        playerRef.current = player;
        peersRef.current = peers;
    }, [player, peers]);

    const createConnection = useCallback((targetPeer: string) => {
        if (peers[targetPeer] !== undefined) return;
        const currentPeer = playerRef.current?.peer;
        if (!currentPeer || peersRef.current[targetPeer] !== undefined) return;
        let conn = currentPeer.connect(targetPeer);
        setupConnection(conn, handleMessage);
        let peerInfo: PeerInfo = {
            id: targetPeer,
            conn,
            totalActionsConsumed: 0
        }
        setPeers(prev => ({ ...prev, [targetPeer]: peerInfo }));
    }, [peers]);

    const handleMessage = useCallback(getMessageHandler({
        onJoinHandshake: (newPlayer: Player) => {
            if (player?.isHost) {
                onPlayerJoined(newPlayer)
            }
        },
        onHandshake: () => { },
        onPeerList: (peers: string[]) => {
            peers.map((p) => createConnection(p))
        }

    }), [onPlayerJoined, createConnection]);

    const isInitialized = useMemo(() => player !== undefined, [player])

    const initialize = useCallback((id: string, name: string, seedPeer: string | undefined) => {
        if (isInitialized) {
            return
        }
        const peer = createPeer(id); // TODO: handle error when this fails
        peer.on('open', (id) => {
            console.log('Peer initialized:', id);
            const player = {
                id,
                name,
                isHost: seedPeer === undefined,
                peer,
            }
            setPlayer(player)
            if (seedPeer !== undefined) {
                createConnection(seedPeer)
            }
        });
    }, [isInitialized])

    return {
        isInitialized,
        initialize,
    }
}

interface PeerInfo {
    id: string,
    conn: DataConnection,
    totalActionsConsumed: number;
}

type VoidWithArg<A> = (p: A) => void;

const prodConfig = {
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
    debug: 2,
};

const localConfig = {
    host: 'localhost',  // Your local signaling server
    port: 9000,          // Port from step 1
    path: '/',           // Default path
    config: {
        iceServers: []   // Empty! No STUN/TURN for local connections
    },
    debug: 2
}

function createPeer(id: string) {
    const peer = new Peer(id, USE_PROD ? prodConfig : localConfig)
    return peer
}

function setupConnection(conn: DataConnection, handleMessage: (m: P2PMessage, f: string) => void) {
    conn.on('open', () => {
        console.log('Connection established with:', conn.peer);
        // maybe do handshakes and etc?
    })

    conn.on('data', (data) => {
        let p2pdata = data as P2PMessage;
        console.log('[DEBUG] Received data from', conn.peer, ':', p2pdata.type);
        handleMessage(p2pdata, conn.peer)
    })

    conn.on('close', () => {
        console.log('[DEBUG] Connection closed with:', conn.peer);
        // TODO: cleanup?
    })

    conn.on('error', (err) => {
        console.error('[ERROR] Connection error with', conn.peer, ':', err);
    })

    // Log ICE connection state changes
    if (conn.peerConnection) {
        conn.peerConnection.oniceconnectionstatechange = () => {
            console.log('[ICE] State changed to:', conn.peerConnection.iceConnectionState);
        };
    }

}

interface HandlerParams {
    onJoinHandshake: VoidWithArg<Player>;
    onHandshake: VoidWithArg<Player>;
    onPeerList: VoidWithArg<string[]>;
}

function getMessageHandler({ onJoinHandshake, onHandshake, onPeerList }: HandlerParams) {
    return (msg: P2PMessage, _fromPeer: string) => {
        switch (msg.type) {
            case "join-handshake":
                onJoinHandshake(msg.data as Player)
                break;
            case "handshake":
                onHandshake(msg.data as Player)
                break;
            case "peer-list":
                onPeerList(msg.data)
                break;
            case "sync":
                break;
            case "game-action":
                break;
        }
    }
}
