// UI Manager for DOM manipulation and component rendering - Pure TypeScript, no innerHTML

import { getAvatarColor, formatTime, debounce } from '../utils/helpers';
import { createElement, createText, clearElement, createSVGElement } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import { mediaLoader } from '../services/media-loader.service';
import { AudioPlayer } from './AudioPlayer';
import { messageContextMenu } from './MessageContextMenu';
import type { User, Chat, Message } from '../types';

export class UIManager {
    private debouncedRenderChatsList: ((chats: Chat[]) => void) | null = null;
    // Show/hide screens
    showAuthScreen(): void {
        document.getElementById('authScreen')?.style.setProperty('display', 'flex');
        document.getElementById('messengerContainer')?.classList.remove('active');
        document.getElementById('profileScreen')?.classList.remove('active');
        document.getElementById('settingsScreen')?.classList.remove('active');
    }

    showMessengerScreen(): void {
        document.getElementById('authScreen')?.style.setProperty('display', 'none');
        document.getElementById('messengerContainer')?.classList.add('active');
        document.getElementById('profileScreen')?.classList.remove('active');
        document.getElementById('settingsScreen')?.classList.remove('active');
    }

    showLoginForm(): void {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        this.clearMessages();
    }

    showRegisterForm(): void {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        this.clearMessages();
    }

    clearMessages(): void {
        const loginMsg = document.getElementById('loginMessage');
        const registerMsg = document.getElementById('registerMessage');
        if (loginMsg) clearElement(loginMsg);
        if (registerMsg) clearElement(registerMsg);
    }

    showError(elementId: string, message: string): void {
        const el = document.getElementById(elementId);
        if (el) {
            clearElement(el);
            const errorDiv = createElement('div', {
                className: 'error-message',
                text: message
            });
            el.appendChild(errorDiv);
        }
    }

    showSuccess(elementId: string, message: string): void {
        const el = document.getElementById(elementId);
        if (el) {
            clearElement(el);
            const successDiv = createElement('div', {
                className: 'success-message',
                text: message
            });
            el.appendChild(successDiv);
        }
    }

    updateUserInfo(user: User): void {
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        const userStatusEl = document.querySelector('.user-status') as HTMLElement;
        
        if (userNameEl) {
            clearElement(userNameEl);
            userNameEl.appendChild(createText(user.username));
            const userIdSpan = createElement('span', {
                className: 'user-id',
                text: `#${user.userId}`
            });
            userNameEl.appendChild(userIdSpan);
        }

        if (userAvatarEl) {
            userAvatarEl.textContent = user.username[0].toUpperCase();
            const [color1, color2] = getAvatarColor(user.username);
            userAvatarEl.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        }
        
        // Update online status if available
        if (userStatusEl && user.online !== undefined) {
            userStatusEl.className = user.online ? 'user-status online' : 'user-status offline';
        }
    }

    updateConnectionStatus(connected: boolean, text?: string): void {
        const statusEl = document.getElementById('connectionStatus');
        const textEl = document.getElementById('connectionText');

        if (statusEl && textEl) {
            statusEl.className = connected ? 'connection-status connected' : 'connection-status disconnected';
            textEl.textContent = text || (connected ? 'Подключено' : 'Отключено');
        }
    }

    renderChatsList(chats: Chat[], immediate = false): void {
        // Initialize debounced version on first call
        if (!this.debouncedRenderChatsList) {
            this.debouncedRenderChatsList = debounce((chats: Chat[]) => {
                this._renderChatsListInternal(chats);
            }, 50);
        }

        if (immediate) {
            this._renderChatsListInternal(chats);
        } else {
            this.debouncedRenderChatsList(chats);
        }
    }

    private _renderChatsListInternal(chats: Chat[]): void {
        const chatsListEl = document.getElementById('chatsList');
        if (!chatsListEl) return;

        clearElement(chatsListEl);

        if (chats.length === 0) {
            const emptyState = createElement('div', {
                className: 'empty-state',
                styles: { padding: '40px 20px' }
            });
            const emptyText = createElement('p', {
                text: 'Нет чатов. Начните новый диалог!',
                styles: { textAlign: 'center', color: '#718096' }
            });
            emptyState.appendChild(emptyText);
            chatsListEl.appendChild(emptyState);
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            fragment.appendChild(chatItem);
        });
        chatsListEl.appendChild(fragment);
    }

    private createChatItem(chat: Chat): HTMLElement {
        const [color1, color2] = getAvatarColor(chat.username);
        
        const hasUnread = (chat.unreadCount || 0) > 0;
        const chatItem = createElement('div', {
            className: hasUnread ? 'chat-item has-unread' : 'chat-item',
            attributes: { 'data-username': chat.username }
        });

        // Add click handler
        chatItem.addEventListener('click', () => {
            (window as any).app.openChat(chat.username);
        });

        // Avatar
        const avatar = createElement('div', {
            className: 'chat-avatar',
            text: chat.username[0].toUpperCase(),
            styles: {
                background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
            }
        });

        if (chat.online) {
            const onlineBadge = createElement('div', { className: 'online-badge' });
            avatar.appendChild(onlineBadge);
        }

        // Chat info
        const chatInfo = createElement('div', { className: 'chat-info' });
        
        // Header
        const chatHeader = createElement('div', { className: 'chat-header' });
        const chatName = createElement('div', { className: 'chat-name' });
        chatName.appendChild(createText(chat.username));
        const userIdSpan = createElement('span', {
            className: 'user-id',
            text: `#${chat.userId}`
        });
        chatName.appendChild(userIdSpan);

        const chatTime = createElement('div', {
            className: 'chat-time',
            text: chat.time || ''
        });

        chatHeader.appendChild(chatName);
        chatHeader.appendChild(chatTime);

        // Preview
        const chatPreview = createElement('div', {
            className: 'chat-preview',
            text: chat.lastMessage || 'Начните общение'
        });

        chatInfo.appendChild(chatHeader);
        chatInfo.appendChild(chatPreview);

        // Unread badge
        chatItem.appendChild(avatar);
        chatItem.appendChild(chatInfo);

        if (chat.unreadCount) {
            const unreadBadge = createElement('span', {
                className: 'unread-badge',
                text: chat.unreadCount.toString()
            });
            chatItem.appendChild(unreadBadge);
        }

        return chatItem;
    }

    renderMessage(message: Message, isSent: boolean): HTMLElement {
        // Use message.from for color generation to keep consistency with profile
        const [color1, color2] = getAvatarColor(message.from);
        // Use 'Вы' for display text, but message.from for avatar letter
        const displayName = isSent ? 'Вы' : message.from;
        const avatarLetter = message.from[0].toUpperCase();
        
        // Format time - always show time only (not dates) for messages in chat
        let time = '';
        if (message.timestamp) {
            // Format timestamp to time only
            const date = new Date(message.timestamp);
            time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (message.time) {
            // If time is already formatted (like "14:30"), use it
            if (message.time.match(/^\d{1,2}:\d{2}$/)) {
                time = message.time;
            } else {
                // Parse and format to time only
                const date = new Date(message.time);
                time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
        } else {
            // Default to current time
            time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }

        const messageDiv = createElement('div', {
            className: isSent ? 'message sent' : 'message',
            attributes: { 'data-message-id': message.id }
        });

        // Avatar
        const avatar = createElement('div', {
            className: 'message-avatar',
            text: avatarLetter,
            styles: {
                background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
            }
        });

        // Message content
        const messageContent = createElement('div', { className: 'message-content' });

        // Reply quote
        if (message.replyTo) {
            const replyQuote = this.createReplyQuote(message.replyTo);
            messageContent.appendChild(replyQuote);
        }

        // Message bubble
        const messageBubble = createElement('div', { className: 'message-bubble' });
        
        if (message.mediaType) {
            const mediaContent = this.createMediaMessage(message);
            messageBubble.appendChild(mediaContent);
            
            // Add caption if there's text with media
            if (message.text && message.text.trim()) {
                const caption = createElement('div', {
                    className: 'media-caption',
                    text: message.text,
                    styles: {
                        marginTop: '8px',
                        fontSize: '14px'
                    }
                });
                messageBubble.appendChild(caption);
            }
        } else {
            messageBubble.appendChild(createText(message.text));
            if (message.edited) {
                const editedTag = createElement('span', {
                    className: 'message-edited',
                    text: '(изменено)',
                    styles: {
                        fontSize: '11px',
                        color: '#718096',
                        fontStyle: 'italic',
                        marginLeft: '5px'
                    }
                });
                messageBubble.appendChild(editedTag);
            }
        }

        messageContent.appendChild(messageBubble);

        // Message time
        const messageTime = createElement('div', { className: 'message-time' });
        messageTime.appendChild(createText(time));
        
        if (isSent) {
            const readStatus = this.createReadStatus(message.read);
            messageTime.appendChild(readStatus);
        }

        messageContent.appendChild(messageTime);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        // Add click handler for selection mode
        messageDiv.addEventListener('click', (e) => {
            const app = (window as any).app;
            if (app && app.selectionMode) {
                e.stopPropagation();
                app.toggleMessageSelection(message.id);
            }
        });

        // Add context menu handler
        messageDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showMessageContextMenu(e, message, isSent);
        });

        // Add long press handler for mobile
        let longPressTimer: any;
        messageDiv.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                const app = (window as any).app;
                if (app && !app.selectionMode) {
                    app.toggleMessageSelection(message.id);
                }
            }, 500);
        });

        messageDiv.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });

        messageDiv.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });

        return messageDiv;
    }

    private showMessageContextMenu(e: MouseEvent, message: Message, isSent: boolean): void {
        // Only show edit for sent text messages (not for media)
        const canEdit = isSent && !message.mediaType;
        
        const app = (window as any).app;

        messageContextMenu.show(e.clientX, e.clientY, {
            onSelect: () => {
                if (app && app.toggleMessageSelection) {
                    app.toggleMessageSelection(message.id);
                }
            },
            onReply: () => {
                if (app && app.replyToMessage) {
                    app.replyToMessage(message);
                }
            },
            onForward: () => {
                if (app && app.forwardMessage) {
                    app.forwardMessage(message);
                }
            },
            onEdit: canEdit ? () => {
                if (app && app.editMessage) {
                    app.editMessage(message);
                }
            } : undefined,
            onPin: () => {
                if (app && app.pinMessage) {
                    app.pinMessage(message);
                }
            },
            onDelete: () => {
                if (app && app.deleteMessage) {
                    app.deleteMessage(message, isSent);
                }
            }
        });
    }

    private createReplyQuote(replyTo: any): HTMLElement {
        const replyQuote = createElement('div', {
            className: 'message-reply-quote',
            styles: {
                background: 'rgba(102, 126, 234, 0.1)',
                borderLeft: '3px solid #667eea',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s'
            }
        });
        
        replyQuote.addEventListener('click', () => {
            (window as any).app.scrollToMessage(replyTo.id);
        });

        replyQuote.addEventListener('mouseenter', () => {
            replyQuote.style.background = 'rgba(102, 126, 234, 0.15)';
        });

        replyQuote.addEventListener('mouseleave', () => {
            replyQuote.style.background = 'rgba(102, 126, 234, 0.1)';
        });

        const replyContent = createElement('div', { 
            className: 'message-reply-content',
            styles: {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }
        });
        
        const replySender = createElement('div', {
            className: 'message-reply-sender',
            text: replyTo.from,
            styles: {
                fontSize: '12px',
                fontWeight: '600',
                color: '#667eea'
            }
        });
        
        const replyText = createElement('div', {
            className: 'message-reply-text',
            text: replyTo.text,
            styles: {
                fontSize: '13px',
                color: '#a0aec0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
            }
        });

        replyContent.appendChild(replySender);
        replyContent.appendChild(replyText);
        replyQuote.appendChild(replyContent);

        return replyQuote;
    }

    private createMediaMessage(message: Message): HTMLElement {
        const mediaDiv = createElement('div', { className: 'media-message' });

        switch (message.mediaType) {
            case 'image':
                const img = createElement('img', {
                    attributes: {
                        alt: 'Loading...'
                    },
                    styles: {
                        maxWidth: '300px',
                        maxHeight: '300px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: '#1a2332',
                        minHeight: '100px',
                        minWidth: '100px'
                    }
                }) as HTMLImageElement;
                
                // Load protected image with authentication
                if (message.mediaUrl) {
                    mediaLoader.loadMedia(message.mediaUrl)
                        .then(blobUrl => {
                            img.src = blobUrl;
                            img.alt = 'Image';
                        })
                        .catch(err => {
                            console.error('Failed to load image:', err);
                            img.alt = 'Failed to load image';
                        });
                }
                
                img.addEventListener('click', () => {
                    if (img.src) {
                        (window as any).app.openImage(img.src);
                    }
                });
                mediaDiv.appendChild(img);
                break;

            case 'video':
                const video = createElement('video', {
                    attributes: {
                        controls: 'true'
                    },
                    styles: {
                        maxWidth: '300px',
                        borderRadius: '10px',
                        background: '#1a2332'
                    }
                }) as HTMLVideoElement;
                
                // Load protected video with authentication
                if (message.mediaUrl) {
                    mediaLoader.loadMedia(message.mediaUrl)
                        .then(blobUrl => {
                            video.src = blobUrl;
                        })
                        .catch(err => {
                            console.error('Failed to load video:', err);
                        });
                }
                
                mediaDiv.appendChild(video);
                break;

            case 'voice':
                const voiceContainer = createElement('div', {
                    className: 'voice-message-container',
                    styles: {
                        minWidth: '240px',
                        maxWidth: '320px'
                    }
                });

                // Load audio URL with authentication
                if (message.mediaUrl) {
                    // Safari workaround: use direct authenticated URL instead of blob
                    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                    
                    if (isSafari) {
                        console.log('Safari detected, using direct URL for audio');
                        
                        // Parse duration
                        let durationSeconds = 0;
                        if (message.duration) {
                            if (typeof message.duration === 'string') {
                                const [mins, secs] = message.duration.split(':').map(Number);
                                durationSeconds = (mins * 60) + (secs || 0);
                            } else {
                                durationSeconds = message.duration;
                            }
                        }

                        // Use direct URL (authentication will be handled by fetch interceptor or custom audio element)
                        const directUrl = message.mediaUrl.startsWith('http') 
                            ? message.mediaUrl 
                            : `${window.location.origin}${message.mediaUrl}`;

                        // Create audio player with direct URL
                        const audioPlayer = new AudioPlayer({
                            audioUrl: directUrl,
                            waveformData: message.waveformData || undefined,
                            duration: durationSeconds
                        });

                        voiceContainer.appendChild(audioPlayer.create());
                    } else {
                        // Chrome and others: use blob URL (works fine)
                        mediaLoader.loadMedia(message.mediaUrl)
                            .then(blobUrl => {
                                // Parse duration
                                let durationSeconds = 0;
                                if (message.duration) {
                                    if (typeof message.duration === 'string') {
                                        const [mins, secs] = message.duration.split(':').map(Number);
                                        durationSeconds = (mins * 60) + (secs || 0);
                                    } else {
                                        durationSeconds = message.duration;
                                    }
                                }

                                // Create audio player with waveform
                                const audioPlayer = new AudioPlayer({
                                    audioUrl: blobUrl,
                                    waveformData: message.waveformData || undefined,
                                    duration: durationSeconds
                                });

                                voiceContainer.appendChild(audioPlayer.create());
                            })
                            .catch(err => {
                                console.error('Failed to load voice message:', err);
                                voiceContainer.appendChild(createText('Ошибка загрузки голосового сообщения'));
                            });
                    }
                } else {
                    voiceContainer.appendChild(createText('Голосовое сообщение недоступно'));
                }

                return voiceContainer;

            case 'file':
                const fileContainer = createElement('div', {
                    className: 'file-message',
                    styles: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 15px',
                        background: 'rgba(102, 126, 234, 0.1)',
                        borderRadius: '10px',
                        cursor: 'pointer'
                    }
                });

                const fileIconWrapper = createElement('span', {
                    className: 'file-icon',
                    styles: {
                        display: 'flex',
                        alignItems: 'center',
                        color: '#667eea'
                    }
                });
                fileIconWrapper.appendChild(createSVGIcon('file', 20, 20));

                const fileInfo = createElement('div', {
                    className: 'file-info',
                    styles: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }
                });

                const fileName = createElement('div', {
                    className: 'file-name',
                    text: message.fileName || 'Файл',
                    styles: {
                        fontSize: '14px',
                        fontWeight: '500'
                    }
                });

                const fileSize = createElement('div', {
                    className: 'file-size',
                    text: String(message.fileSize || ''),
                    styles: {
                        fontSize: '12px',
                        color: '#718096'
                    }
                });

                fileInfo.appendChild(fileName);
                fileInfo.appendChild(fileSize);

                fileContainer.appendChild(fileIconWrapper);
                fileContainer.appendChild(fileInfo);

                fileContainer.addEventListener('click', () => {
                    window.open(message.mediaUrl);
                });

                return fileContainer;

            default:
                mediaDiv.textContent = message.text;
        }

        return mediaDiv;
    }

    private createReadStatus(read?: boolean): HTMLElement {
        const statusSpan = createElement('span', { className: 'message-read-status' });
        
        // Create SVG use element
        const svg = createSVGElement('svg', {
            width: '14',
            height: '14',
            class: read ? 'read' : ''
        });
        
        const use = createSVGElement('use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 
            read ? '#icon-checkDouble' : '#icon-checkSingle'
        );
        
        svg.appendChild(use);
        statusSpan.appendChild(svg);

        return statusSpan;
    }

    appendMessage(messageElement: HTMLElement): void {
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            messagesArea.appendChild(messageElement);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    clearChatArea(): void {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        clearElement(chatArea);

        const emptyState = createElement('div', { className: 'empty-state' });
        const emptyIcon = createElement('div', { className: 'empty-state-icon' });
        emptyIcon.appendChild(createSVGIcon('chat', 80, 80, 'icon-svg'));

        const emptyTitle = createElement('h3', { text: 'Выберите чат' });
        const emptyText = createElement('p', {
            text: 'Выберите пользователя из списка слева, чтобы начать общение'
        });

        emptyState.appendChild(emptyIcon);
        emptyState.appendChild(emptyTitle);
        emptyState.appendChild(emptyText);
        chatArea.appendChild(emptyState);
    }

    setButtonLoading(buttonId: string, loading: boolean, text?: string): void {
        const btn = document.getElementById(buttonId) as HTMLButtonElement;
        if (btn) {
            btn.disabled = loading;
            if (text) {
                btn.textContent = text;
            }
        }
    }

    renderChatArea(chat: Chat, messages: Message[]): void {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        clearElement(chatArea);

        // Chat header
        const header = this.createChatHeader(chat);
        chatArea.appendChild(header);

        // Messages area
        const messagesArea = createElement('div', {
            id: 'messagesArea',
            className: 'messages-area'
        });

        if (messages.length === 0) {
            const emptyMessages = createElement('div', { className: 'empty-state' });
            
            const emptyIcon = createElement('div', { className: 'empty-state-icon' });
            emptyIcon.appendChild(createSVGIcon('chat', 80, 80, 'icon-svg'));
            
            const emptyTitle = createElement('h3', { text: 'Нет сообщений' });
            const emptyText = createElement('p', {
                text: 'Начните общение с этим пользователем'
            });
            
            emptyMessages.appendChild(emptyIcon);
            emptyMessages.appendChild(emptyTitle);
            emptyMessages.appendChild(emptyText);
            messagesArea.appendChild(emptyMessages);
        } else {
            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            messages.forEach(msg => {
                const isSent = msg.to === chat.username;
                const messageEl = this.renderMessage(msg, isSent);
                fragment.appendChild(messageEl);
            });
            messagesArea.appendChild(fragment);
        }

        chatArea.appendChild(messagesArea);

        // Message input
        const inputContainer = this.createMessageInput();
        chatArea.appendChild(inputContainer);

        // Scroll to bottom and focus input
        setTimeout(() => {
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            // Auto-focus on message input
            const messageInput = document.getElementById('messageInput') as HTMLInputElement;
            if (messageInput) {
                messageInput.focus();
            }
        }, 0);

        // Setup handlers
        this.setupMessageInputHandlers();
    }

    private createChatHeader(chat: Chat): HTMLElement {
        const [color1, color2] = getAvatarColor(chat.username);
        
        const header = createElement('div', { className: 'chat-header-bar' });
        const headerUser = createElement('div', { className: 'chat-header-user' });

        // Avatar
        const avatar = createElement('div', {
            className: 'chat-avatar',
            text: chat.username[0].toUpperCase(),
            styles: {
                background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
            }
        });

        if (chat.online) {
            const onlineBadge = createElement('div', { className: 'online-badge' });
            avatar.appendChild(onlineBadge);
        }

        // Header info
        const headerInfo = createElement('div', { className: 'chat-header-info' });
        const chatName = createElement('div', { className: 'chat-header-name' });
        chatName.appendChild(createText(chat.username));
        const userIdSpan = createElement('span', {
            className: 'user-id',
            text: ` #${chat.userId}`,
            styles: { fontSize: '12px', color: '#718096', fontWeight: '400' }
        });
        chatName.appendChild(userIdSpan);

        const chatStatus = createElement('div', {
            id: 'chatHeaderStatus',
            className: chat.online ? 'chat-header-status' : 'chat-header-status offline',
            text: chat.online ? 'В сети' : 'Не в сети'
        });

        headerInfo.appendChild(chatName);
        headerInfo.appendChild(chatStatus);

        headerUser.appendChild(avatar);
        headerUser.appendChild(headerInfo);
        header.appendChild(headerUser);

        return header;
    }

    private createMessageInput(): HTMLElement {
        const messageInputArea = createElement('div', { className: 'message-input-area' });
        const inputContainer = createElement('div', { className: 'input-container' });

        // Attachment button (left)
        const attachBtn = createElement('button', {
            id: 'attachBtn',
            className: 'attach-btn',
            attributes: { title: 'Прикрепить фото' }
        });
        attachBtn.appendChild(createSVGIcon('attach', 20, 20));

        // Input (center)
        const input = createElement('input', {
            id: 'messageInput',
            attributes: {
                type: 'text',
                placeholder: 'Введите сообщение...'
            }
        });

        // Get voice recorder button from app (will be initialized on first use)
        const voiceBtn = (window as any).app?.getVoiceRecorderButton();
        let voiceBtnElement;
        if (!voiceBtn) {
            // Fallback: create placeholder button
            voiceBtnElement = createElement('button', {
                id: 'voiceBtn',
                className: 'voice-btn',
                attributes: { title: 'Голосовое сообщение' }
            });
            voiceBtnElement.appendChild(createSVGIcon('mic', 20, 20));
        } else {
            voiceBtnElement = voiceBtn;
        }

        // Send button (right)
        const sendBtn = createElement('button', {
            id: 'sendBtn',
            className: 'send-btn'
        });
        sendBtn.appendChild(createSVGIcon('send', 20, 20));

        // Add in correct order: attach, input, voice, send
        inputContainer.appendChild(attachBtn);
        inputContainer.appendChild(input);
        inputContainer.appendChild(voiceBtnElement);
        inputContainer.appendChild(sendBtn);
        messageInputArea.appendChild(inputContainer);

        return messageInputArea;
    }

    private setupMessageInputHandlers(): void {
        const input = document.getElementById('messageInput') as HTMLInputElement;
        const sendBtn = document.getElementById('sendBtn');
        const attachBtn = document.getElementById('attachBtn');
        const voiceBtn = document.getElementById('voiceBtn');

        if (!input || !sendBtn) return;

        // Send message on button click
        sendBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text && (window as any).app) {
                (window as any).app.sendMessage(text);
                input.value = '';
            }
        });

        // Send message on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendBtn.click();
            }
        });

        // Paste handler for images from clipboard
        input.addEventListener('paste', async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (blob && (window as any).app) {
                        await (window as any).app.handlePastedImage(blob);
                    }
                    break;
                }
            }
        });

        // Attach photo
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                if ((window as any).app) {
                    (window as any).app.sendPhoto();
                }
            });
        }

        // Voice message - now handled by VoiceRecorder component
        // No additional handlers needed here, VoiceRecorder manages its own state
    }

    updateTypingStatus(username: string, isTyping: boolean): void {
        const statusEl = document.getElementById('chatHeaderStatus');
        if (statusEl) {
            if (isTyping) {
                statusEl.textContent = 'печатает...';
                statusEl.className = 'chat-header-status typing';
            } else {
                // Check if user is online from chat data
                statusEl.textContent = 'В сети';
                statusEl.className = 'chat-header-status';
            }
        }
    }
}

export const uiManager = new UIManager();
