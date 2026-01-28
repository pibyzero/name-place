import { useState, useRef, useEffect, useCallback } from 'react'
import { GameState, Message } from '../../types/game'

interface ChatUIProps {
    messages: Message[]
    gameState: GameState
    currentPlayerId: string
    onSendMessage: (message: string) => void
}

export const ChatUI = ({ messages, currentPlayerId, onSendMessage, gameState }: ChatUIProps) => {
    const [isCollapsed, setIsCollapsed] = useState(true)
    const [inputValue, setInputValue] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)
    const [previousMessageCount, setPreviousMessageCount] = useState(0)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const lastMessageRef = useRef<Message | null>(null)

    // Play notification sound using Web Audio API
    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800 // Frequency in Hz
            oscillator.type = 'sine'

            gainNode.gain.value = 0.3
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.1)
        } catch (error) {
            console.error('Could not play notification sound:', error)
        }
    }

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (!isCollapsed) {
            scrollToBottom()
            setUnreadCount(0)
        }
    }, [messages, isCollapsed])

    // Track unread messages when collapsed
    useEffect(() => {
        if (isCollapsed && messages.length > previousMessageCount) {
            const newMessageCount = messages.length - previousMessageCount
            setUnreadCount(prev => prev + newMessageCount)
        }
        setPreviousMessageCount(messages.length)
    }, [messages.length, isCollapsed, previousMessageCount])

    // Clear unread count when expanded
    useEffect(() => {
        if (!isCollapsed) {
            setUnreadCount(0)
        }
    }, [isCollapsed])

    // Play sound for new messages from other players
    useEffect(() => {
        const latestMessage = messages[messages.length - 1]

        // Only play sound if:
        // 1. There's a new message
        // 2. It's different from the last one we saw
        // 3. It's from another player (not current user)
        if (
            latestMessage &&
            lastMessageRef.current !== latestMessage &&
            latestMessage.sender !== currentPlayerId
        ) {
            playNotificationSound()
        }

        // Update the ref to track the latest message
        if (latestMessage) {
            lastMessageRef.current = latestMessage
        }
    }, [messages, currentPlayerId])

    const getPlayerName = useCallback((id: string) => {
        return gameState.players.filter(p => p.id == id)[0]?.name || id
    }, [gameState])

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim())
            setInputValue('')
            inputRef.current?.focus()
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date)
    }

    return (
        <>
            {/* Collapsed Chat Button */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="fixed bottom-4 right-4 z-50 bg-teal text-white rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105 flex items-center gap-2 px-4 py-3"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    <span className="font-semibold">Chat</span>
                    {unreadCount > 0 && (
                        <span className="bg-coral text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Expanded Chat Window */}
            {!isCollapsed && (
                <div className="fixed bottom-0 right-4 z-50 w-80 h-96 bg-white rounded-t-lg shadow-xl border border-gray-200 flex flex-col">
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 bg-teal text-white rounded-t-lg cursor-pointer hover:bg-opacity-90 transition-colors flex-shrink-0"
                        onClick={() => setIsCollapsed(true)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Chat</span>
                        </div>
                        <button className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 min-h-0">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm mt-8">
                                    No messages yet. Start a conversation!
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isCurrentUser = msg.sender === currentPlayerId
                                    return (
                                        <div
                                            key={index}
                                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                        >
                                            <div className={`max-w-[70%] ${isCurrentUser
                                                ? 'bg-teal text-white'
                                                : 'bg-white border border-gray-200'
                                                } rounded-lg py-1 px-2 shadow-sm`}>
                                                {!isCurrentUser && (
                                                    <div className="text-xs font-bold text-charcoal">
                                                        {getPlayerName(msg.sender)}
                                                    </div>
                                                )}
                                                <div className={`text-xs break-words ${isCurrentUser ? 'text-white' : 'text-charcoal'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`text-xs ${isCurrentUser ? 'text-white text-opacity-70' : 'text-gray-300'
                                                    }`}>
                                                    {formatTime(new Date(msg.timestamp))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    autoFocus
                                    placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm bg-white"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim()}
                                    className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
