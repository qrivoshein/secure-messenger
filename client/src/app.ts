// Main application class

import { authService } from './services/auth.service';
import { httpClient } from './api/http.client';
import { wsService } from './services/websocket.service';
import { audioService } from './services/audio.service';
import { uiManager } from './components/ui-manager';
import { requestNotificationPermission, showBrowserNotification } from './utils/helpers';
import type { User, Chat, Message } from './types';

class MessengerApp {
    private currentChat: Chat | null = null;
    private users: User[] = [];
    private chats: Chat[] = [];
    private unreadMessages: Map<string, number> = new Map();
    private onlineUsers: Set<string> = new Set();

    async init(): Promise<void> {
        console.log('Initializing Messenger App...');

        // Setup event listeners
        this.setupEventListeners();

        // Setup WebSocket event handlers
        this.setupWebSocketHandlers();

        // Try to restore session
        const user = await authService.tryRestoreSession();
        if (user) {
            uiManager.updateUserInfo(user);
            uiManager.showMessengerScreen();
            await this.loadUsers();
            await requestNotificationPermission();
        } else {
            uiManager.showAuthScreen();
            uiManager.showLoginForm();
        }

        // Setup global app reference for inline event handlers
        (window as any).app = this;
    }

    private setupEventListeners(): void {
        // Auth form handlers
        document.getElementById('showRegisterLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            uiManager.showRegisterForm();
        });

        document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            uiManager.showLoginForm();
        });

        document.getElementById('loginBtn')?.addEventListener('click', () => {
            const username = (document.getElementById('loginUsername') as HTMLInputElement)?.value || '';
            const password = (document.getElementById('loginPassword') as HTMLInputElement)?.value || '';
            this.login(username, password);
        });

        document.getElementById('registerBtn')?.addEventListener('click', () => {
            const username = (document.getElementById('registerUsername') as HTMLInputElement)?.value || '';
            const password = (document.getElementById('registerPassword') as HTMLInputElement)?.value || '';
            const passwordConfirm = (document.getElementById('registerPasswordConfirm') as HTMLInputElement)?.value || '';
            this.register(username, password, passwordConfirm);
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Enter key handlers
        document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loginBtn')?.click();
            }
        });

        document.getElementById('registerPasswordConfirm')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('registerBtn')?.click();
            }
        });
    }

    private setupWebSocketHandlers(): void {
        wsService.on('connection_status', ({ connected, error }) => {
            if (error) {
                uiManager.updateConnectionStatus(false, 'Ошибка подключения');
            } else {
                uiManager.updateConnectionStatus(connected, connected ? 'Подключено' : 'Подключение...');
            }
        });

        wsService.on('auth_success', () => {
            console.log('WebSocket authenticated');
        });

        wsService.on('auth_error', (data) => {
            console.error('WebSocket auth failed:', data.error);
            this.logout();
        });

        wsService.on('message', ({ message }) => {
            this.handleIncomingMessage(message);
        });

        wsService.on('online_users', ({ users }) => {
            this.onlineUsers = new Set(users);
            this.updateOnlineStatuses();
        });

        wsService.on('typing', ({ from, isTyping }) => {
            this.handleTypingIndicator(from, isTyping);
        });

        wsService.on('messages_read', ({ messageIds, by }) => {
            this.handleMessagesRead(messageIds, by);
        });

        wsService.on('ping', () => {
            wsService.send({ type: 'pong' });
        });
    }

    // Auth methods
    async login(username: string, password: string): Promise<void> {
        try {
            uiManager.setButtonLoading('loginBtn', true, 'Вход...');
            
            const user = await authService.login(username, password);
            
            uiManager.updateUserInfo(user);
            uiManager.showMessengerScreen();
            
            await this.loadUsers();
            await requestNotificationPermission();
            
        } catch (error: any) {
            uiManager.showError('loginMessage', error.message || 'Ошибка авторизации');
        } finally {
            uiManager.setButtonLoading('loginBtn', false);
        }
    }

    async register(username: string, password: string, passwordConfirm: string): Promise<void> {
        try {
            if (!username || !password) {
                uiManager.showError('registerMessage', 'Пожалуйста, заполните все поля');
                return;
            }

            if (username.length < 3) {
                uiManager.showError('registerMessage', 'Логин должен содержать минимум 3 символа');
                return;
            }

            if (password.length < 6) {
                uiManager.showError('registerMessage', 'Пароль должен содержать минимум 6 символов');
                return;
            }

            if (password !== passwordConfirm) {
                uiManager.showError('registerMessage', 'Пароли не совпадают');
                return;
            }

            uiManager.setButtonLoading('registerBtn', true, 'Регистрация...');
            
            await authService.register(username, password);
            
            uiManager.showSuccess('registerMessage', 'Регистрация успешна! Войдите в систему');
            
            setTimeout(() => {
                uiManager.showLoginForm();
            }, 1500);
            
        } catch (error: any) {
            uiManager.showError('registerMessage', error.message || 'Ошибка регистрации');
        } finally {
            uiManager.setButtonLoading('registerBtn', false);
        }
    }

    logout(): void {
        authService.logout();
        this.currentChat = null;
        this.users = [];
        this.chats = [];
        this.unreadMessages.clear();
        this.onlineUsers.clear();
        uiManager.showAuthScreen();
        uiManager.showLoginForm();
    }

    // User and chat management
    async loadUsers(): Promise<void> {
        try {
            const data = await httpClient.getUsers();
            this.users = data.users;
            this.updateChatsList();
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    private updateChatsList(): void {
        this.chats = this.users.map(user => ({
            username: user.username,
            userId: user.userId,
            online: this.onlineUsers.has(user.username),
            unreadCount: this.unreadMessages.get(user.username) || 0,
        }));

        uiManager.renderChatsList(this.chats);
    }

    async openChat(username: string): Promise<void> {
        const user = this.users.find(u => u.username === username);
        if (!user) return;

        this.currentChat = {
            username: user.username,
            userId: user.userId,
            online: this.onlineUsers.has(user.username),
        };

        // Clear unread count
        this.unreadMessages.delete(username);
        this.updateChatsList();

        // Load messages
        try {
            const data = await httpClient.getMessages(username);
            // Render chat UI with messages
            // TODO: Implement full chat rendering
            console.log('Loaded messages:', data.messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (!this.currentChat || !text.trim()) return;

        try {
            await httpClient.sendMessage(this.currentChat.username, {
                text: text.trim(),
            });

            // Message will be added via WebSocket event
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    private handleIncomingMessage(message: Message): void {
        const fromUser = message.from;
        const isCurrentChat = this.currentChat && this.currentChat.username === fromUser;

        if (isCurrentChat) {
            // Add to current chat
            const html = uiManager.renderMessage(message, false);
            uiManager.appendMessage(html);

            // Mark as read
            wsService.send({
                type: 'mark_read',
                from: fromUser,
            });

            // Play sound
            audioService.playNotificationSound();
        } else {
            // Increment unread count
            const current = this.unreadMessages.get(fromUser) || 0;
            this.unreadMessages.set(fromUser, current + 1);

            // Play notification
            audioService.playNotificationSound();
            showBrowserNotification(
                `Новое сообщение от ${fromUser}`,
                message.text || '[Медиа]',
                fromUser
            );

            // Update chats list
            this.updateChatsList();
        }
    }

    private updateOnlineStatuses(): void {
        this.updateChatsList();
    }

    private handleTypingIndicator(from: string, isTyping: boolean): void {
        if (this.currentChat && this.currentChat.username === from) {
            // Update typing indicator in UI
            console.log(`${from} is ${isTyping ? 'typing' : 'not typing'}`);
        }
    }

    private handleMessagesRead(messageIds: string[], by: string): void {
        if (this.currentChat && this.currentChat.username === by) {
            // Update read status in UI
            messageIds.forEach(id => {
                const messageEl = document.querySelector(`[data-message-id="${id}"]`);
                if (messageEl) {
                    const readIcon = messageEl.querySelector('.message-read-status svg');
                    if (readIcon) {
                        readIcon.classList.add('read');
                        const useEl = readIcon.querySelector('use');
                        if (useEl) {
                            useEl.setAttribute('href', '#icon-check-double');
                        }
                    }
                }
            });
        }
    }

    // UI helper methods for inline handlers
    openImage(url: string): void {
        const modal = document.getElementById('imageModal');
        const img = document.getElementById('imageModalImg') as HTMLImageElement;
        if (modal && img) {
            img.src = url;
            modal.classList.add('active');
        }
    }

    scrollToMessage(messageId: string): void {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Initialize app when DOM is ready
const app = new MessengerApp();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

export default app;
