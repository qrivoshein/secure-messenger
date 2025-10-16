// WebSocket service for real-time communication
import { config } from '../config';
import type { WebSocketMessage } from '../types';

type MessageHandler = (data: any) => void;

export class WebSocketService {
    private ws: WebSocket | null = null;
    private wsUrl: string;
    private token: string | null = null;
    private handlers: Map<string, MessageHandler[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;

    constructor() {
        this.wsUrl = config.wsUrl;
    }

    connect(token: string): void {
        this.token = token;
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connection_status', { connected: true });
            
            // Authenticate
            this.send({
                type: 'auth',
                token: this.token!,
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('connection_status', { connected: false, error });
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.emit('connection_status', { connected: false });
            
            if (this.token && this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    console.log('Reconnecting...');
                    this.reconnectAttempts++;
                    this.connect(this.token!);
                }, this.reconnectDelay);
            }
        };
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.token = null;
        this.reconnectAttempts = 0;
    }

    send(message: WebSocketMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    on(event: string, handler: MessageHandler): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
    }

    off(event: string, handler: MessageHandler): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    private handleMessage(data: any): void {
        const { type, ...payload } = data;
        this.emit(type, payload);
    }

    private emit(event: string, data: any): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const wsService = new WebSocketService();
