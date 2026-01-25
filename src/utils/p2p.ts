import Peer, { DataConnection } from "peerjs";
import { VoidWithArg } from "../types/common";
import { GameEvent, Player } from "../types/game";
import { P2PMessage } from "../types/p2p";

const USE_PROD = (import.meta.env.VITE_ENV || '').toLowerCase() == "prod";

export function getRoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#room\/([^?]+)/);
    return match ? match[1] : undefined;
}

// Generate a game room name.
export function generateRoomName() {
    const adjectives = ['happy', 'sunny', 'cosmic', 'wild', 'bright', 'swift', 'noble', 'misty'];
    const nouns = ['tiger', 'ocean', 'mountain', 'forest', 'river', 'storm', 'eagle'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const random = Math.random().toString(16).slice(2, 2 + 4);
    return `${adj}-${noun}-${random}`;
}

export function roomNameFromSeedPeer(seedPeer: string | undefined): string | undefined {
    if (seedPeer === undefined) return undefined
    // TODO; check format
    return seedPeer.split('-').slice(0, 2).join('-')
}

export function getSeedPeerFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/seed-peer=([^&]+)/);
    return match ? match[1] : undefined;
}

export function createURL(roomName: string, seedPeer: string) {
    const url = `${window.location.origin}${window.location.pathname}#room/${roomName}?seed-peer=${seedPeer}`;
    return url
}

const prodConfig = {
    config: {
        iceServers: [
            // STUN server
            { urls: 'stun:stun.relay.metered.ca:80' },

            // TURN server with multiple endpoints in ONE entry
            {
                urls: [
                    'turn:global.relay.metered.ca:80',
                    'turn:global.relay.metered.ca:80?transport=tcp',
                    'turn:global.relay.metered.ca:443',
                    'turn:global.relay.metered.ca:443?transport=tcp'
                ],
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            }
        ],
        iceTransportPolicy: 'all'
    },
    debug: 2,
};

const localhost = 'localhost';

const localConfig = {
    host: localhost,
    port: 9000,
    path: '/',
    config: {
        iceServers: []   // No STUN/TURN for local connections
    },
    debug: 2
}

export function createPeer(id: string) {
    const peer = new Peer(id, USE_PROD ? prodConfig : localConfig)
    return peer
}

export function setupConnection(conn: DataConnection, handleMessage: (m: P2PMessage, f: string) => void, onOpen: VoidWithArg<DataConnection>) {
    conn.on('open', () => {
        console.log('Connection established with:', conn.peer);
        onOpen(conn)
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
    onJoinHandshake: VoidWithArg<P2PMessage>;
    onHandshake: VoidWithArg<Player>;
    onPeerList: VoidWithArg<string[]>;
    onGameEvents: VoidWithArg<GameEvent[]>;
}

export function getMessageHandler({ onJoinHandshake, onHandshake, onPeerList, onGameEvents }: HandlerParams) {
    return (msg: P2PMessage, _fromPeer: string) => {
        switch (msg.type) {
            case "join-handshake":
                onJoinHandshake(msg)
                break;
            case "handshake":
                onHandshake(msg.data as Player)
                break;
            case "peer-list":
                onPeerList(msg.data)
                break;
            case "game-events":
                console.warn("received game events", msg)
                onGameEvents(msg.data)
                break;
        }
    }
}
