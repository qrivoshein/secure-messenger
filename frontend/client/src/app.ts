// Main application class

import { authService } from './services/auth.service';
import { formatTime } from './utils/helpers';
import { httpClient } from './api/http.client';
import { wsService } from './services/websocket.service';
import { audioService } from './services/audio.service';
import { mediaService } from './services/media.service';
import { uiManager } from './components/ui-manager';
import { requestNotificationPermission, showBrowserNotification, generateId } from './utils/helpers';
import { initSVGSprite } from './utils/icons';
import { AuthComponent } from './components/AuthComponent';
import { MessengerComponent } from './components/MessengerComponent';
import { ProfileComponent } from './components/ProfileComponent';
import { SettingsComponent } from './components/SettingsComponent';
import { newChatModal } from './components/NewChatModal';
import { uploadIndicator } from './components/UploadIndicator';
import { VoiceRecorder } from './components/VoiceRecorder';
import type { User, Chat, Message } from './types';

class MessengerApp {
    private currentChat: Chat | null = null;
    private users: User[] = [];
    private chats: Chat[] = [];
    private unreadMessages: Map<string, number> = new Map();
    private onlineUsers: Set<string> = new Set();
    private voiceRecorder: VoiceRecorder | null = null;

    async init(): Promise<void> {
        console.log('Initializing Messenger App...');

        // Initialize SVG sprite
        initSVGSprite();

        // Initialize UI components
        this.initializeComponents();

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

    private initializeComponents(): void {
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error('App container not found!');
            return;
        }

        // Create and append all components
        const authComponent = new AuthComponent();
        const messengerComponent = new MessengerComponent();
        const profileComponent = new ProfileComponent();
        const settingsComponent = new SettingsComponent();

        appContainer.appendChild(authComponent.create());
        appContainer.appendChild(messengerComponent.create());
        appContainer.appendChild(profileComponent.create());
        appContainer.appendChild(settingsComponent.create());
        appContainer.appendChild(newChatModal.create());
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

        // New chat button
        document.getElementById('newChatBtn')?.addEventListener('click', () => {
            this.showNewChatDialog();
        });

        // Search chats
        const searchInput = document.getElementById('searchChatsInput') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value;
                this.filterChats(query);
            });
        }

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

        wsService.on('message', async ({ message }) => {
            await this.handleIncomingMessage(message);
        });

        wsService.on('message_sent', ({ messageId }) => {
            console.log('Message sent successfully:', messageId);
        });

        wsService.on('online_users', ({ users }) => {
            console.log('📡 Received online_users:', users);
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
            
            // Set user as online initially
            user.online = true;
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
            // Backend already returns users with lastMessage, time and unreadCount
            this.users = data.users.map((user: any) => {
                // Parse timestamp once during loading for better performance
                const timestamp = user.time ? this.parseTimeToTimestamp(user.time) : 0;
                return {
                    username: user.username,
                    userId: user.userId,
                    lastMessage: user.lastMessage || 'Начните общение',
                    time: user.time || '',
                    _timestamp: timestamp
                };
            });
            
            // Restore unread counts from backend
            data.users.forEach((user: any) => {
                if (user.unreadCount && user.unreadCount > 0) {
                    this.unreadMessages.set(user.username, user.unreadCount);
                }
            });
            
            this.updateChatsList();
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    private updateChatsList(): void {
        this.chats = this.users.map((user: any) => ({
            username: user.username,
            userId: user.userId,
            online: this.onlineUsers.has(user.username),
            unreadCount: this.unreadMessages.get(user.username) || 0,
            lastMessage: user.lastMessage || 'Начните общение',
            time: user.time || '',
            _timestamp: user._timestamp || this.parseTimeToTimestamp(user.time) || 0
        }));

        // Sort by timestamp - newest first
        this.chats.sort((a, b) => {
            const timeA = (a as any)._timestamp || 0;
            const timeB = (b as any)._timestamp || 0;
            return timeB - timeA;
        });

        uiManager.renderChatsList(this.chats);
    }

    private parseTimeToTimestamp(timeStr: string): number {
        if (!timeStr) return 0;
        
        // If it's already a full ISO timestamp (2024-10-16T14:30:00)
        if (timeStr.includes('T') || timeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            return new Date(timeStr).getTime();
        }
        
        // If it's a date in format "16.10" or "16/10" (day.month)
        if (timeStr.match(/^\d{1,2}[./]\d{1,2}$/)) {
            const [day, month] = timeStr.split(/[./]/).map(Number);
            if (!isNaN(day) && !isNaN(month)) {
                const now = new Date();
                const year = now.getFullYear();
                // Create date with current year
                const date = new Date(year, month - 1, day);
                // If the date is in the future, use previous year
                if (date > now) {
                    date.setFullYear(year - 1);
                }
                return date.getTime();
            }
        }
        
        // If it's just time like "14:30", use today's date
        if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                const now = new Date();
                now.setHours(hours, minutes, 0, 0);
                return now.getTime();
            }
        }
        
        return 0;
    }

    async openChat(username: string): Promise<void> {
        let user = this.users.find(u => u.username === username);
        
        // If user not in active chats list, fetch all users to get their info
        if (!user) {
            try {
                const data = await httpClient.getAllUsers();
                user = data.users.find(u => u.username === username);
                
                if (!user) {
                    console.error('User not found:', username);
                    return;
                }
                
                // Add to users list for future
                this.users.push(user);
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                return;
            }
        }

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
            uiManager.renderChatArea(this.currentChat, data.messages || []);
            
            // Mark all messages from this user as read
            if (data.messages && data.messages.length > 0) {
                const hasUnreadMessages = data.messages.some((msg: Message) => 
                    msg.from === username && !msg.read
                );
                
                if (hasUnreadMessages) {
                    wsService.send({
                        type: 'mark_read',
                        from: username
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            uiManager.renderChatArea(this.currentChat, []);
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (!this.currentChat || !text.trim()) return;

        try {
            const messageId = generateId();
            
            // Send via WebSocket for real-time delivery
            wsService.send({
                type: 'message',
                to: this.currentChat.username,
                text: text.trim(),
                messageId: messageId
            });

            // Message will be added via WebSocket event (message_sent or message)
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    async sendPhoto(): Promise<void> {
        if (!this.currentChat) {
            alert('Сначала выберите чат');
            return;
        }

        try {
            const file = await mediaService.selectImage();
            if (!file) return;

            // Show upload indicator
            uploadIndicator.show(file.name);

            // Upload file
            const uploadData = await httpClient.uploadFile(file, this.currentChat.username);
            
            // Hide indicator
            uploadIndicator.hide();
            
            // Send message with image
            const messageId = generateId();
            wsService.send({
                type: 'message',
                to: this.currentChat.username,
                text: '',
                messageId: messageId,
                mediaType: 'image',
                mediaUrl: uploadData.fileUrl,
                fileName: uploadData.fileName,
                fileSize: uploadData.fileSize
            });

            console.log('Photo sent successfully');
        } catch (error: any) {
            console.error('Failed to send photo:', error);
            uploadIndicator.showError(error.message || 'Ошибка отправки фото');
        }
    }

    initializeVoiceRecorder(): void {
        this.voiceRecorder = new VoiceRecorder({
            onRecordComplete: async (audioBlob: Blob, waveformData: number[]) => {
                await this.sendVoiceMessage(audioBlob, waveformData);
            },
            onCancel: () => {
                console.log('Voice recording cancelled');
            }
        });
    }

    async sendVoiceMessage(audioBlob: Blob, waveformData: number[]): Promise<void> {
        if (!this.currentChat) return;

        try {
            // Convert blob to file
            const fileName = `voice-${Date.now()}.webm`;
            const audioFile = mediaService.blobToFile(audioBlob, fileName);

            // Show upload indicator
            uploadIndicator.show('Голосовое сообщение');

            // Upload file
            const uploadData = await httpClient.uploadFile(audioFile, this.currentChat.username);
            
            // Hide indicator
            uploadIndicator.hide();
            
            // Calculate duration
            const audioDuration = await this.getAudioDuration(audioBlob);
            
            // Send message with voice and waveform data
            const messageId = generateId();
            wsService.send({
                type: 'message',
                to: this.currentChat.username,
                text: '',
                messageId: messageId,
                mediaType: 'voice',
                mediaUrl: uploadData.fileUrl,
                fileName: uploadData.fileName,
                fileSize: uploadData.fileSize,
                duration: this.formatDuration(audioDuration),
                waveformData: waveformData
            });

            console.log('Voice message sent successfully');
        } catch (error: any) {
            console.error('Failed to send voice message:', error);
            uploadIndicator.showError(error.message || 'Ошибка отправки');
        }
    }

    private async getAudioDuration(blob: Blob): Promise<number> {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(blob);
            audio.addEventListener('loadedmetadata', () => {
                URL.revokeObjectURL(audio.src);
                resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
                resolve(0);
            });
        });
    }

    private formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getVoiceRecorderButton(): HTMLElement | null {
        if (!this.voiceRecorder) {
            this.initializeVoiceRecorder();
        }
        return this.voiceRecorder?.createRecordButton() || null;
    }

    private async handleIncomingMessage(message: Message): Promise<void> {
        const currentUsername = authService.getCurrentUser()?.username;
        const fromUser = message.from;
        const toUser = message.to;
        
        // Check if this is a sent message (from current user)
        const isSentMessage = fromUser === currentUsername;
        const isReceivedMessage = toUser === currentUsername;
        
        // Determine the other user in conversation
        const otherUsername = isSentMessage ? toUser : fromUser;
        
        // For received messages from new users - add them to list first
        if (isReceivedMessage) {
            const existingUser = this.users.find(u => u.username === fromUser);
            if (!existingUser) {
                try {
                    // Fetch all users to get sender info
                    const data = await httpClient.getAllUsers();
                    const newUser = data.users.find((u: any) => u.username === fromUser);
                    if (newUser) {
                        // Add new user with message preview
                        const timeStr = formatTime(message.timestamp || message.time || new Date().toISOString());
                        const timestamp = message.timestamp ? new Date(message.timestamp).getTime() : Date.now();
                        
                        const userWithMessage: any = {
                            username: newUser.username,
                            userId: newUser.userId,
                            lastMessage: message.text || '[Медиа]',
                            time: timeStr,
                            _timestamp: timestamp
                        };
                        this.users.push(userWithMessage);
                        console.log('Added new user to list:', fromUser);
                    }
                } catch (error) {
                    console.error('Failed to fetch new user info:', error);
                }
            }
        }
        
        // Update lastMessage in users list for preview
        const userInList = this.users.find((u: any) => u.username === otherUsername);
        if (userInList) {
            const timeStr = formatTime(message.timestamp || message.time || new Date().toISOString());
            const timestamp = message.timestamp ? new Date(message.timestamp).getTime() : Date.now();
            
            (userInList as any).lastMessage = message.text || '[Медиа]';
            (userInList as any).time = timeStr;
            (userInList as any)._timestamp = timestamp;
        }
        
        // For sent messages, check if we're in the chat with recipient
        const isCurrentChat = this.currentChat && (
            (isSentMessage && this.currentChat.username === toUser) ||
            (isReceivedMessage && this.currentChat.username === fromUser)
        );

        if (isCurrentChat) {
            // Add to current chat
            const html = uiManager.renderMessage(message, isSentMessage);
            uiManager.appendMessage(html);

            // Mark as read if it's a received message
            if (isReceivedMessage) {
                wsService.send({
                    type: 'mark_read',
                    from: fromUser,
                });
            }

            // Play sound only for received messages
            if (isReceivedMessage) {
                audioService.playNotificationSound();
            }
        } else if (isReceivedMessage) {
            // Increment unread count only for received messages
            const current = this.unreadMessages.get(fromUser) || 0;
            this.unreadMessages.set(fromUser, current + 1);

            // Play notification
            audioService.playNotificationSound();
            showBrowserNotification(
                `Новое сообщение от ${fromUser}`,
                message.text || '[Медиа]',
                fromUser
            );
        }
        
        // Always update chats list to show new message
        this.updateChatsList();
    }

    private updateOnlineStatuses(): void {
        console.log('🟢 Updating online statuses. Online users:', Array.from(this.onlineUsers));
        
        // Update chats list
        this.updateChatsList();
        
        // Update current chat header if chat is open
        if (this.currentChat) {
            const isOnline = this.onlineUsers.has(this.currentChat.username);
            this.currentChat.online = isOnline;
            
            // Update header status
            const statusEl = document.getElementById('chatHeaderStatus') as HTMLElement;
            if (statusEl) {
                statusEl.textContent = isOnline ? 'В сети' : 'Не в сети';
                statusEl.className = isOnline ? 'chat-header-status' : 'chat-header-status offline';
            }
            
            // Update online badge in header avatar
            const headerAvatar = document.querySelector('.chat-header-bar .chat-avatar');
            if (headerAvatar) {
                const existingBadge = headerAvatar.querySelector('.online-badge');
                if (isOnline && !existingBadge) {
                    const onlineBadge = document.createElement('div');
                    onlineBadge.className = 'online-badge';
                    headerAvatar.appendChild(onlineBadge);
                } else if (!isOnline && existingBadge) {
                    existingBadge.remove();
                }
            }
        }
    }

    private handleTypingIndicator(from: string, isTyping: boolean): void {
        if (this.currentChat && this.currentChat.username === from) {
            // Update typing indicator in UI
            uiManager.updateTypingStatus(from, isTyping);
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
        const closeBtn = document.querySelector('.image-modal-close') as HTMLElement;
        
        if (!modal || !img) return;
        
        // Set image and show modal
        img.src = url;
        modal.style.display = 'flex';
        
        // Close function
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        // Close on button click (remove old listeners first)
        const newCloseBtn = closeBtn.cloneNode(true) as HTMLElement;
        closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
        });
        
        // Close on background click (not on image)
        const handleModalClick = (e: MouseEvent) => {
            if (e.target === modal) {
                closeModal();
                modal.removeEventListener('click', handleModalClick);
            }
        };
        modal.addEventListener('click', handleModalClick);
        
        // Close on Escape key
        const closeOnEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    scrollToMessage(messageId: string): void {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    async showNewChatDialog(): Promise<void> {
        try {
            // Load ALL users from system, not just active chats
            const data = await httpClient.getAllUsers();
            newChatModal.show(data.users, (username) => {
                this.openChat(username);
            });
        } catch (error) {
            console.error('Failed to load all users:', error);
            // Fallback to current users list
            newChatModal.show(this.users, (username) => {
                this.openChat(username);
            });
        }
    }

    filterChats(query: string): void {
        const filteredChats = this.chats.filter(chat => {
            const queryLower = query.toLowerCase();
            return (
                chat.username.toLowerCase().includes(queryLower) ||
                chat.userId.toLowerCase().includes(queryLower)
            );
        });
        uiManager.renderChatsList(filteredChats);
    }

    async handlePastedImage(blob: Blob): Promise<void> {
        if (!this.currentChat) {
            alert('Сначала откройте чат');
            return;
        }

        try {
            const fileName = `screenshot-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            // Show upload indicator
            uploadIndicator.show(fileName);
            
            // Upload file
            const uploadData = await httpClient.uploadFile(file, this.currentChat.username);
            
            // Hide indicator
            uploadIndicator.hide();
            
            // Send message with image
            const messageId = generateId();
            wsService.send({
                type: 'message',
                to: this.currentChat.username,
                text: '',
                messageId: messageId,
                mediaType: 'image',
                mediaUrl: uploadData.fileUrl,
                fileName: uploadData.fileName,
                fileSize: uploadData.fileSize
            });

            console.log('Screenshot sent successfully');
        } catch (error: any) {
            console.error('Failed to send screenshot:', error);
            uploadIndicator.showError(error.message || 'Ошибка отправки');
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
