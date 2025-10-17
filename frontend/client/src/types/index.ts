// Core types for the messenger application

export interface User {
    username: string;
    userId: string;
    online?: boolean;
}

export interface Message {
    id: string;
    from: string;
    to: string;
    text: string;
    time: string;
    timestamp: string;
    encrypted?: {
        encrypted: number[];
        iv: number[];
    };
    mediaType?: 'image' | 'video' | 'audio' | 'voice' | 'file';
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: string | number;
    waveformData?: number[];
    edited?: boolean;
    forwarded?: boolean;
    replyTo?: {
        id: string;
        from: string;
        text: string;
    };
    read?: boolean;
}

export interface Chat {
    username: string;
    userId: string;
    lastMessage?: string;
    time?: string;
    unreadCount?: number;
    online?: boolean;
}

export interface WebSocketMessage {
    type: 'auth' | 'message' | 'typing' | 'mark_read' | 'edit_message' | 'delete_message' | 
          'delete_message_for_me' | 'forward_message' | 'pin_message' | 'unpin_message' | 'pong';
    token?: string;
    message?: Message;
    from?: string;
    to?: string;
    isTyping?: boolean;
    messageId?: string;
    messageIds?: string[];
    newText?: string;
    pinType?: 'shared' | 'local';
    chatId?: string;
    [key: string]: any;
}

export interface AppState {
    currentUser: User | null;
    currentToken: string | null;
    currentChat: Chat | null;
    users: User[];
    onlineUsers: Set<string>;
    unreadMessages: Map<string, number>;
    pinnedMessages: Map<string, string>;
    localPinnedMessages: Map<string, string>;
}
