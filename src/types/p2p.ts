import { DataConnection } from "peerjs";
import { GameEvent, Player } from "./game";

export interface P2PMessage {
    type: 'join-handshake' | 'handshake' | 'peer-list' | 'game-events';
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


export interface GameEventMessage extends P2PMessage {
    type: 'game-events';
    data: GameEvent[];
}

export interface PeerInfo {
    id: string,
    conn: DataConnection,
    myEventsConsumed: number;
    receivedEvents: Set<string>;
}
