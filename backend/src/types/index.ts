import { Request } from 'express';
import WebSocket from 'ws';

export interface User {
    userId: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
}

export interface Message {
    id: string;
    from: string;
    to: string;
    text: string;
    mediaType?: string;
    mediaUrl?: string;
    fileSize?: number;
    duration?: string;
    waveformData?: number[];
    forwarded?: boolean;
    forwardedFrom?: string;
    replyToMessageId?: string;
    replyToText?: string;
    replyToSender?: string;
    read: boolean;
    timestamp: Date;
    edited?: boolean;
    deleted?: boolean;
}

export interface AuthRequest extends Request {
    user?: {
        username: string;
        userId: string;
    };
}

export interface ExtendedWebSocket extends WebSocket {
    username?: string;
    userId?: string;
}

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export interface Config {
    server: {
        port: number;
        host: string;
        env: string;
    };
    db: {
        user: string;
        host: string;
        database: string;
        password: string;
        port: number;
    };
    redis: {
        host: string;
        port: number;
    };
    auth: {
        sessionTTL: number;
        bcryptRounds: number;
        tokenLength: number;
    };
    upload: {
        maxFileSize: number;
        uploadDir: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    websocket: {
        pingInterval: number;
        onlineStatusTTL: number;
        typingStatusTTL: number;
    };
}

export interface ChatUser {
    username: string;
    userId: string;
    online?: boolean;
}
