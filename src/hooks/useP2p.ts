import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GameEvent, GameEventType, LocalState, Player } from "../types/game"
import Peer, { DataConnection } from "peerjs";
import { VoidWithArg } from "../types/common";
import { P2PMessage, PeerInfo } from "../types/p2p";
import { createPeer, getMessageHandler, setupConnection } from "../utils/p2p";

// Assumptions:
//  - All the peers have synced time i.e. none of them are too far in the past or future
//      - This affects the players joinedAt attribute.

export interface UseP2PProps {
    onPlayerJoined: VoidWithArg<Player>
    onGameAction: VoidWithArg<any>
}

interface P2PPlayer extends Player {
    peer: Peer
}

export function useP2P() {
    const [player, setPlayer] = useState<P2PPlayer | undefined>();
    const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
    const [allGameEvents, setAllGameEvents] = useState<GameEvent[]>([]);
    // Game events received/derived from p2p messages. These will be consumed and copied over to all Game
    // Events
    const [peerEvents, setPeerEvents] = useState<GameEvent[]>([]);
    const [host, setHost] = useState<string>();
    const [status, setStatus] = useState<'uninitialized' | 'initialized' | 'joined'>('uninitialized');
    const [roomName, setRoomName] = useState<string>();

    // Use refs to always have latest values in callbacks
    const playerRef = useRef(player);
    const peersRef = useRef(peers);

    useEffect(() => {
        playerRef.current = player;
        peersRef.current = peers;
    }, [player, peers]);

    const createConnection = useCallback((targetPeer: string, onOpen: VoidWithArg<DataConnection>) => {
        if (peers[targetPeer] !== undefined) return;
        const currentPeer = playerRef.current?.peer;
        if (!currentPeer || peersRef.current[targetPeer] !== undefined) return;
        console.warn("creating connection with", targetPeer);
        let conn = currentPeer.connect(targetPeer);
        setupConnection(conn, handleMessage, onOpen);
        let peerInfo: PeerInfo = {
            id: targetPeer,
            conn,
            myEventsConsumed: 0,
            peerEventsConsumed: 0,
        }
        setPeers(prev => ({ ...prev, [targetPeer]: peerInfo }));
    }, [peers]);

    const handleMessage = useCallback(getMessageHandler({
        onJoinHandshake: (newPlayer: Player) => {
            let player = playerRef.current;
            if (player?.isHost) {
                let event = createGameEvent('add-player', newPlayer)
                setPeerEvents(prev => [...prev, event])
            }
            // also create connection
            createConnection(newPlayer.id, () => { })
        },
        onHandshake: () => { },
        onPeerList: (peers: string[]) => {
            peers.map((p) => createConnection(p, () => { }))
        },
        onGameEvents: (evs: GameEvent[]) => {
            setPeerEvents(prev => [...prev, ...evs])
        }

    }), [createConnection, player, peerEvents]);

    const isInitialized = useMemo(() => player !== undefined, [player])

    const initialize = useCallback((roomName: string, id: string, name: string, seedPeer: string | undefined) => {
        if (isInitialized) {
            return
        }
        const peer = createPeer(id); // TODO: handle error when this fails
        peer.on('open', (id) => {
            console.log('Peer initialized:', id);
            const player = {
                id,
                name,
                joinedAt: new Date().getTime(),
                isHost: seedPeer === undefined,
                peer,
            }
            if (seedPeer !== undefined) {
                console.log("creating connection with host")
                setHost(seedPeer)
            } else {
                setHost(id)
            }
            setPlayer(player)
            setRoomName(roomName)
            setStatus('initialized')
        });
        peer.on('connection', (conn: DataConnection) => {
            setupConnection(conn, handleMessage, () => { })
        })
    }, [isInitialized])

    const sendGameEvents = useCallback(async (peer: string, events: any[]) => {
        console.warn("sending game events")
        if (!peers[peer]) {
            console.warn("Sending data to peer failed. peer:", peer)
        }
        const conn = peers[peer].conn;
        console.warn("conn OPEN", conn.open)
        console.warn("conn on open listeners", conn.listeners("open"))
        if (!conn.open) {
            console.warn("connection not yet open")
            return false
        }
        const p2pMessage: P2PMessage = { type: 'game-events', data: events };
        await conn.send(p2pMessage);
        return true
    }, [peers])

    const createGameEvent = useCallback((type: GameEventType, payload: any) => {
        let evidx = allGameEvents.length;
        let event: GameEvent = {
            id: `${playerRef.current?.id}-${evidx}`,
            timestamp: new Date().getTime(),
            type,
            payload,
        }
        setAllGameEvents(prev => [...prev, event])
        return event
    }, [allGameEvents]);

    // Clear peer events and append them to all game events
    const clearPeerEvents = useCallback(() => {
        setAllGameEvents(prev => [...prev, ...peerEvents])
        setPeerEvents([])
    }, [peerEvents, allGameEvents])

    // Broadcast game events based on peer
    const broadcastGameEvents = useCallback(() => {
        let newPeers: Record<string, PeerInfo> = {};

        Object.entries(peers).forEach(async ([peerId, peerinfo]) => {
            let start = peerinfo.myEventsConsumed;
            // Filter events not from the peer itself
            const events = allGameEvents.slice(start).filter((ev) => ev.id.indexOf(peerId) < 0);
            let ok = false;
            if (events.length > 0) {
                console.warn("sending game events to", peerId)
                ok = await sendGameEvents(peerId, events);
                console.warn("OK?", ok)
            }
            // update consumed events count only if send succeeded
            if (ok) {
                let newPeerInfo: PeerInfo = { ...peerinfo, myEventsConsumed: allGameEvents.length };
                newPeers[peerId] = newPeerInfo
            }
        })
        setPeers(prev => ({ ...prev, ...newPeers }))

    }, [peers, allGameEvents])

    const me: Player | undefined = player
        ? {
            id: player.id,
            isHost: player.isHost,
            joinedAt: player.joinedAt,
            name: player.name
        } : undefined;

    return {
        status,
        state: {
            player: me,
            host: host,
            roomName,
        } as LocalState,
        actions: {
            broadcastGameEvents,
            clearPeerEvents,
        },
        create: {
            addPlayerEvent: (player: Player) => createGameEvent('add-player', player),
            setWaitingEvent: () => createGameEvent('set-waiting-status', undefined),
            startGameEvent: (playerIdx: number) => createGameEvent('start-game', playerIdx)
        },
        isInitialized,
        isHost: player?.isHost,
        initialize,
        setRoomName,
        createConnection,
        peerEvents,
        allGameEvents,
    }
}
