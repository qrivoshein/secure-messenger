// Authentication service

import { httpClient } from '../api/http.client';
import { wsService } from './websocket.service';
import { encryptionService } from './encryption.service';
import type { User } from '../types';

export class AuthService {
    private currentUser: User | null = null;
    private currentToken: string | null = null;

    async login(username: string, password: string): Promise<User> {
        const data = await httpClient.login(username, password);
        
        this.currentUser = {
            username: data.username,
            userId: data.userId,
        };
        this.currentToken = data.token;

        // Store in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.userId);

        // Set token for HTTP client
        httpClient.setToken(data.token);

        // Generate encryption key
        await encryptionService.generateKey();

        // Connect WebSocket
        wsService.connect(data.token);

        return this.currentUser;
    }

    async register(username: string, password: string): Promise<void> {
        await httpClient.register(username, password);
    }

    logout(): void {
        // Disconnect WebSocket
        wsService.disconnect();

        // Clear state
        this.currentUser = null;
        this.currentToken = null;

        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');

        // Clear HTTP client token
        httpClient.setToken(null);
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    getCurrentToken(): string | null {
        return this.currentToken;
    }

    isAuthenticated(): boolean {
        return this.currentUser !== null && this.currentToken !== null;
    }

    async tryRestoreSession(): Promise<User | null> {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('userId');

        if (token && username && userId) {
            this.currentUser = { username, userId };
            this.currentToken = token;
            
            httpClient.setToken(token);
            await encryptionService.generateKey();
            wsService.connect(token);

            return this.currentUser;
        }

        return null;
    }
}

export const authService = new AuthService();
