import Peer, { DataConnection } from "peerjs";
import { GameState, LocalState } from "./types/game";

export function getSeedPeerFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/seed-peer=([^&]+)/);
    return match ? match[1] : null;
}

export function createURL(roomName: string, seedPeer: string) {
    const url = `${window.location.origin}${window.location.pathname}#room/${roomName}?seed-peer=${seedPeer}`;
    return url
}

export function initializePeer(localState: LocalState, gameState: GameState, seedPeer: string | null) {
    const peer = new Peer(localState.playerId, {
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
            iceServers: [], // TODO: add servers list
            iceTransportPolicy: 'all'
        },
        debug: 2
    })

    peer.on('open', (id) => {
        console.log('Peer initialized:', id);

        if (seedPeer && seedPeer !== id) {
            console.log('Connecting to seed:', seedPeer);
            const conn = peer.connect(seedPeer);
            // Set up connection if not connected already
            if (!localState.peers.includes(seedPeer)) {
                setupConnection(conn, localState, gameState);
            }
        }
    });

}

function setupConnection(conn: DataConnection, localState: LocalState, gameState: GameState) {
    console.log('[DEBUG] Setting up connection with:', conn.peer);

    conn.on('open', () => {
        console.log('[SUCCESS] Connection established with:', conn.peer);

        // Send handshake message
        conn.send({
            type: 'handshake',
            player: { name: localState.playerName, id: localState.playerId }
        });
        console.log('[DEBUG] Sent handshake msg to:', conn.peer);

        // Send list of all known peers
        conn.send({
            type: 'peer-list',
            peers: Array.from(localState.peers).filter(p => p !== conn.peer)
        });
        console.log('[DEBUG] Sent peer list to:', conn.peer);

        // Send game state
        conn.send({
            type: 'sync',
            peers: gameState,
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
    throw new Error("Function not implemented.");
}
