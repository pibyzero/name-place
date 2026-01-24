import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GameEvent, GameEventType, LocalState, Player, AnswersData, ReviewData, SubmitRoundReadinessData, GameConfig } from "../types/game"
import Peer, { DataConnection } from "peerjs";
import { VoidWithArg } from "../types/common";
import { P2PMessage, PeerInfo } from "../types/p2p";
import { createPeer, setupConnection } from "../utils/p2p";

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

type MsgFrom = string;

export function useP2P() {
    const [player, setPlayer] = useState<P2PPlayer | undefined>();
    const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
    // Messages that can affect the Game state
    const [p2pMessages, setP2pMessages] = useState<[P2PMessage, MsgFrom][]>([]);
    const [myGameEvents, setMyGameEvents] = useState<GameEvent[]>([]);
    // Game events received/derived from p2p messages. These will be consumed and copied over to all Game
    // To keep track of received peer events and not applying them duplicately
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
            receivedEvents: new Set()
        }
        setPeers(prev => ({ ...prev, [targetPeer]: peerInfo }));
    }, [peers]);

    const handleMessage = useCallback((msg: P2PMessage, from: string) => {
        setP2pMessages(prev => [...prev, [msg, from]])
    }, [])

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
        if (!peers[peer]) {
            console.warn("Sending data to peer failed because no peer data. peer:", peer)
            return false
        }
        const conn = peers[peer].conn;
        if (!conn.open) {
            console.warn("connection not yet open")
            return false
        }
        const p2pMessage: P2PMessage = { type: 'game-events', data: events };
        await conn.send(p2pMessage);
        return true
    }, [peers])

    const createGameEvent = useCallback((type: GameEventType, payload: any) => {
        let evidx = myGameEvents.length;
        let event: GameEvent = {
            id: `${playerRef.current?.id}-${evidx}`,
            timestamp: new Date().getTime(),
            type,
            payload,
        }
        setMyGameEvents(prev => [...prev, event])
        return event
    }, [myGameEvents]);

    // Broadcast game events created by this node based on peer
    const broadcastGameEvents = useCallback(() => {
        let newPeers: Record<string, PeerInfo> = {};

        Object.entries(peers).forEach(async ([peerId, peerinfo]) => {
            let start = peerinfo.myEventsConsumed;
            // Get my events from last consumed index
            const myevs = myGameEvents.slice(start)
            const events = [...myevs]
            let ok = false;
            if (events.length > 0) {
                console.warn("sending game events to", peerId)
                ok = await sendGameEvents(peerId, events);
                console.warn("OK?", ok)
            }
            // update consumed events count only if send succeeded
            if (ok) {
                let newPeerInfo: PeerInfo = { ...peerinfo, myEventsConsumed: myGameEvents.length };
                newPeers[peerId] = newPeerInfo
            }
        })
        setPeers(prev => ({ ...prev, ...newPeers }))

    }, [peers, myGameEvents])

    // Relay events received from other peers
    const relayGameEvents = useCallback((evs: GameEvent[]) => {
        Object.entries(peers).forEach(async ([peerId, _]) => {
            const filtered_evs = evs.filter(ev => !ev.id.includes(peerId));
            let ok = false;
            if (filtered_evs.length > 0) {
                console.warn("relaying game events to", peerId)
                ok = await sendGameEvents(peerId, filtered_evs);
                console.warn("relaying ok: ", ok)
            }
        })
    }, [sendGameEvents])


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
            relayGameEvents,
            broadcastGameEvents,
            clearP2pMessages: useCallback(() => {
                setP2pMessages([])
            }, []),
            setReceivedEventsFrom: useCallback((evs: GameEvent[], from: string) => {
                setPeers(prev => {
                    let peerInfo = peers[from]
                    let newreceived = new Set(peerInfo.receivedEvents)
                    evs.forEach(ev => newreceived.add(ev.id))
                    return {
                        ...prev,
                        [from]: {
                            ...prev[from],
                            receivedEvents: newreceived,
                        }
                    }
                })
            }, [peers])
        },
        create: {
            initGameEvent: (config: GameConfig) => createGameEvent('init-game', config),
            addPlayerEvent: (player: Player) => createGameEvent('add-player', player),
            setWaitingPeersEvent: () => createGameEvent('set-waiting-peers', undefined),
            waitRoundReadinessEvent: (playerIdx: number) => createGameEvent('wait-round-readiness', playerIdx),
            submitRoundReadinessEvent: (data: SubmitRoundReadinessData) => createGameEvent('submit-round-readiness', data),
            startRoundEvent: (data: string) => createGameEvent('start-round', data),
            stopRoundEvent: (data: AnswersData) => createGameEvent('stop-round', data),
            submitAnswersEvent: (data: AnswersData) => createGameEvent('submit-answers', data),
            submitReviewEvent: (data: ReviewData) => createGameEvent('submit-review', data)
        },
        isInitialized,
        isHost: player?.isHost,
        initialize,
        setRoomName,
        createConnection,
        p2pMessages,
        myGameEvents,
        isAlreadyReceivedEventFrom: useCallback((ev: GameEvent, from: string) => {
            return peers[from].receivedEvents.has(ev.id)
        }, [peers]),

    }
}
