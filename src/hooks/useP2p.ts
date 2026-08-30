import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GameEvent, GameEventType, LocalState, Player, AnswersData, ReviewData, SubmitRoundReadinessData, GameConfig, Message } from "../types/game"
import Peer, { DataConnection } from "peerjs";
import { VoidWithArg } from "../types/common";
import { P2PMessage, PeerInfo } from "../types/p2p";
import { createPeer, setupConnection } from "../utils/p2p";

// Assumptions:
//  - All the peers have synced time i.e. none of them are too far in the past or future
//      - This affects the players joinedAt attribute.

const PEER_SYNC_INTERVAL = 1000; // ms

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
    const [lastSyncedPeerIds, setLastSyncedPeerIds] = useState(new Set());
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
    const lastSyncedRef = useRef(lastSyncedPeerIds);
    const eventCounterRef = useRef(0)
    // Timestamp of the last 'pong' received from each peer (for liveness detection)
    const lastPongRef = useRef<Record<string, number>>({})

    useEffect(() => {
        playerRef.current = player;
        peersRef.current = peers;
        lastSyncedRef.current = lastSyncedPeerIds
    }, [player, peers, lastSyncedPeerIds]);

    // Set timer to periodically broadcast peer-list
    useEffect(() => {
        const intervalId = setInterval(() => {
            let peers = peersRef.current || {}
            let peerIds = Object.keys(peers)
            const currentPeerSet = new Set(peerIds);
            const lastSynced = lastSyncedRef.current;

            if (currentPeerSet.size === lastSynced.size &&
                [...currentPeerSet].every(id => lastSynced.has(id))) {
                return; // Already synced, skip
            }
            Object.values(peers).filter(p => !!p.conn).forEach(p => {
                p.conn.send({ type: 'peer-list', data: peerIds })
            })
            setLastSyncedPeerIds(currentPeerSet)
        }, PEER_SYNC_INTERVAL);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);


    const createConnection = useCallback((targetPeer: string, onOpen: VoidWithArg<DataConnection>, onClose: VoidWithArg<string> = () => { }) => {
        const currentPeer = playerRef.current?.peer;
        if (!currentPeer) return;

        // Reuse an existing connection (e.g. an inbound one we already
        // registered) instead of opening a duplicate data channel.
        const existing = peersRef.current[targetPeer];
        if (existing) {
            if (existing.conn?.open) onOpen(existing.conn)
            existing.conn?.on('close', () => onClose(targetPeer))
            return
        }

        console.warn("creating connection with", targetPeer);
        let conn = currentPeer.connect(targetPeer);
        const onCloseInner = (pid: string) => {
            onClose(pid)
            setPeers(prev => {
                const { [pid]: removed, ...rest } = prev
                return rest
            })
        }
        setupConnection(conn, handleMessage, onOpen, onCloseInner);
        let peerInfo: PeerInfo = {
            id: targetPeer,
            conn,
            myEventsConsumed: 0,
            receivedEvents: new Set()
        }
        setPeers(prev => ({ ...prev, [targetPeer]: peerInfo }));
    }, []);

    const handleMessage = useCallback((msg: P2PMessage, from: string) => {
        // Liveness heartbeat messages are handled here and never surface as
        // game messages (keeps App from re-rendering on every ping).
        if (msg.type === 'ping') {
            peersRef.current[from]?.conn?.send({ type: 'pong' })
            return
        }
        if (msg.type === 'pong') {
            lastPongRef.current[from] = Date.now()
            return
        }
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
            setupConnection(conn, handleMessage, () => { }, (pid: string) => {
                setPeers(prev => {
                    const { [pid]: removed, ...rest } = prev
                    return rest
                })
            })
            // Register inbound connections so later outbound attempts (from
            // join-handshake or peer-list processing) reuse them instead of
            // opening duplicate data channels to the same peer.
            if (!peersRef.current[conn.peer]) {
                setPeers(prev => {
                    if (prev[conn.peer]) return prev
                    return { ...prev, [conn.peer]: { id: conn.peer, conn, myEventsConsumed: 0, receivedEvents: new Set() } }
                })
            }
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
        let event: GameEvent = {
            id: `${playerRef.current?.id}-${eventCounterRef.current++}`,
            timestamp: new Date().getTime(),
            type,
            payload,
        }
        setMyGameEvents(prev => [...prev, event])
        return event
    }, []);

    // Broadcast game events created by this node based on peer
    const broadcastGameEvents = useCallback((immediateEvents?: GameEvent[]) => {
        let newConsumed: Record<string, number> = {};

        Object.entries(peers).forEach(async ([peerId, peerinfo]) => {
            let start = peerinfo.myEventsConsumed;
            // Send any unsent backlog PLUS the immediate events so no event is
            // ever skipped for a peer that fell behind.
            const toSendEvents = [
                ...myGameEvents.slice(start),
                ...(immediateEvents ?? []).filter(ev => !myGameEvents.some(e => e.id === ev.id))
            ]
            let ok = false;
            if (toSendEvents.length > 0) {
                console.warn("sending game events to", peerId)
                ok = await sendGameEvents(peerId, toSendEvents);
                console.warn("OK?", ok)
            }
            // update consumed events count only if send succeeded
            if (ok) {
                newConsumed[peerId] = start + toSendEvents.length
            }
        })

        // Functional update so concurrently-updated fields (e.g. receivedEvents)
        // are preserved instead of being clobbered by a stale peer snapshot.
        setPeers(prev => {
            const updated: Record<string, PeerInfo> = {};
            Object.entries(newConsumed).forEach(([pid, count]) => {
                const info = prev[pid];
                if (info) updated[pid] = { ...info, myEventsConsumed: count };
            });
            return { ...prev, ...updated };
        })
    }, [peers, myGameEvents])

    // Relay events received from other peers
    const relayGameEvents = useCallback((evs: GameEvent[]) => {
        Object.entries(peers).forEach(async ([peerId, _]) => {
            // Exclude events that originated from the target peer. Event ids are
            // "{originPeerId}-{seq}", so compare the extracted origin rather than
            // using a substring match (peer ids can be prefixes of one another,
            // e.g. the host id is a prefix of every joiner id).
            const filtered_evs = evs.filter(ev => {
                const sep = ev.id.lastIndexOf('-')
                return sep === -1 || ev.id.slice(0, sep) !== peerId
            });
            let ok = false;
            if (filtered_evs.length > 0) {
                console.warn("relaying game events to", peerId)
                ok = await sendGameEvents(peerId, filtered_evs);
                console.warn("relaying ok: ", ok)
            }
        })
    }, [sendGameEvents])

    const createMessageEvent = useCallback((content: string) => {
        // Use the same "{peerId}-{seq}" scheme as game events so vector-clock
        // parsing and sync logic treat messages uniformly (the old
        // "{peerId}-msg-{seq}" format produced phantom vector-clock entries).
        const len = eventCounterRef.current
        const msgId = `${player?.id}-${len}`
        let message: Message = {
            id: msgId,
            content,
            sender: player?.id || "--",
            timestamp: new Date().getTime()
        }
        return createGameEvent('send-message', message)
    }, [player, createGameEvent])

    const me: Player | undefined = player
        ? {
            id: player.id,
            isHost: player.isHost,
            joinedAt: player.joinedAt,
            name: player.name
        } : undefined;

    return {
        status,
        peersRef,
        state: {
            player: me,
            host: host,
            roomName,
        } as LocalState,
        actions: useMemo(() => ({
            relayGameEvents,
            broadcastGameEvents,
            requestEventsSync: (vectorClock: Record<string, number>) => {
                // Broadcast sync request to all connected peers
                Object.entries(peers).forEach(([peerId, peerInfo]) => {
                    if (peerInfo.conn && peerInfo.conn.open) {
                        const syncRequest: P2PMessage = {
                            type: 'request-events-sync',
                            data: {
                                requesterId: player?.id || '',
                                vectorClock
                            }
                        }
                        peerInfo.conn.send(syncRequest)
                        console.log(`Sent sync request to ${peerId} with vector clock:`, vectorClock)
                    }
                })
            },
            sendSyncResponse: (toPeerId: string, events: GameEvent[]) => {
                if (events.length > 0 && peers[toPeerId]?.conn?.open) {
                    const response: P2PMessage = {
                        type: 'events-sync-response',
                        data: {
                            responderId: player?.id || '',
                            events
                        }
                    }
                    peers[toPeerId].conn.send(response)
                    console.log(`Sent ${events.length} missing events to ${toPeerId}`)
                }
            },
            pingAll: () => {
                Object.values(peers).forEach(peerInfo => {
                    if (peerInfo.conn && peerInfo.conn.open) {
                        peerInfo.conn.send({ type: 'ping' })
                    }
                })
            },
            getInactivePeers: (timeoutMs: number) => {
                const now = Date.now()
                return Object.keys(peers).filter(pid => {
                    const lastPong = lastPongRef.current[pid]
                    return lastPong !== undefined && now - lastPong > timeoutMs
                })
            },
            clearP2pMessages: () => setP2pMessages([]),
            setReceivedEventsFrom: (evs: GameEvent[], from: string) => {
                setPeers(prev => {
                    let peerInfo = prev[from]
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
            }
        }), [relayGameEvents, broadcastGameEvents, peers, player]),
        create: useMemo(() => ({
            initGameEvent: (config: GameConfig) => createGameEvent('init-game', config),
            removePlayerEvent: (pid: string) => createGameEvent('remove-player', pid),
            addPlayerEvent: (player: Player) => createGameEvent('add-player', player),
            setWaitingPeersEvent: () => createGameEvent('set-waiting-peers', undefined),
            waitRoundReadinessEvent: (playerIdx: number) => createGameEvent('wait-round-readiness', playerIdx),
            submitRoundReadinessEvent: (data: SubmitRoundReadinessData) => createGameEvent('submit-round-readiness', data),
            startRoundEvent: (data: string) => createGameEvent('start-round', data),
            stopRoundEvent: (data: AnswersData) => createGameEvent('stop-round', data),
            submitAnswersEvent: (data: AnswersData) => createGameEvent('submit-answers', data),
            submitReviewEvent: (data: ReviewData) => createGameEvent('submit-review', data),
            sendMessageEvent: (text: string) => createMessageEvent(text)
        }), [player]),
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
