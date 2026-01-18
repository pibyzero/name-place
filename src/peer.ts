import Peer, { DataConnection } from "peerjs";

export function getSeedPeerFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/seed-peer=([^&]+)/);
    return match ? match[1] : null;
}

export function createURL(roomName: string, seedPeer: string) {
    const url = `${window.location.origin}${window.location.pathname}#room/${roomName}?seed-peer=${seedPeer}`;
    return url
}

export function initializePeer(myPeerId: string, seedPeer: string | null, existingPeers: string[]) {
    const peer = new Peer(myPeerId, {
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
            if (!existingPeers.includes(seedPeer)) {
                setupConnection(conn);
            }
        } else if (seedPeer === null) {
            // i.e. if it is a host, do nothing
            const url = `${window.location.origin}${window.location.pathname}#room/${roomName}?seed=${id}`;
        }
    });

}

function setupConnection(conn: DataConnection) {
    console.log('[DEBUG] Setting up connection with:', conn.peer);

    conn.on('open', () => {
        console.log('[SUCCESS] Connection established with:', conn.peer);

        // Send full CRDT state
        conn.send({
            type: 'sync',
            state: crdt.getState()
        });
        console.log('[DEBUG] Sent sync state to:', conn.peer);

        // Send list of all known peers
        conn.send({
            type: 'peer-list',
            peers: Array.from(knownPeers).filter(p => p !== conn.peer)
        });
        console.log('[DEBUG] Sent peer list to:', conn.peer);
    });

    conn.on('data', (data) => {
        console.log('[DEBUG] Received data from', conn.peer, ':', data.type);
        handleIncomingData(data);
    });

    conn.on('close', () => {
        console.log('[DEBUG] Connection closed with:', conn.peer);
        connections = connections.filter(c => c !== conn);
        updatePeerStats();

        if (connections.length === 0) {
            updateStatus('waiting', 'Waiting for peers');
        }
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

