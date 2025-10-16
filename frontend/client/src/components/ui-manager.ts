// UI Manager for DOM manipulation and component rendering - Pure TypeScript, no innerHTML

import { getAvatarColor, formatTime } from '../utils/helpers';
import { createElement, createText, clearElement, createSVGElement } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import type { User, Chat, Message } from '../types';

export class UIManager {
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
    }

    updateConnectionStatus(connected: boolean, text?: string): void {
        const statusEl = document.getElementById('connectionStatus');
        const textEl = document.getElementById('connectionText');

        if (statusEl && textEl) {
            statusEl.className = connected ? 'connection-status connected' : 'connection-status disconnected';
            textEl.textContent = text || (connected ? 'Подключено' : 'Отключено');
        }
    }

    renderChatsList(chats: Chat[]): void {
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

        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            chatsListEl.appendChild(chatItem);
        });
    }

    private createChatItem(chat: Chat): HTMLElement {
        const [color1, color2] = getAvatarColor(chat.username);
        
        const chatItem = createElement('div', {
            className: 'chat-item',
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
        const username = isSent ? 'Вы' : message.from;
        const [color1, color2] = getAvatarColor(username);
        const time = formatTime(message.time || message.timestamp);

        const messageDiv = createElement('div', {
            className: isSent ? 'message sent' : 'message',
            attributes: { 'data-message-id': message.id }
        });

        // Avatar
        const avatar = createElement('div', {
            className: 'message-avatar',
            text: username[0].toUpperCase(),
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
        } else {
            messageBubble.appendChild(createText(message.text));
            if (message.edited) {
                const editedTag = createElement('span', {
                    className: 'message-edited',
                    text: '(изменено)'
                });
                messageBubble.appendChild(createText(' '));
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

        return messageDiv;
    }

    private createReplyQuote(replyTo: any): HTMLElement {
        const replyQuote = createElement('div', { className: 'message-reply-quote' });
        
        replyQuote.addEventListener('click', () => {
            (window as any).app.scrollToMessage(replyTo.id);
        });

        const replyContent = createElement('div', { className: 'message-reply-content' });
        
        const replySender = createElement('div', {
            className: 'message-reply-sender',
            text: replyTo.from
        });
        
        const replyText = createElement('div', {
            className: 'message-reply-text',
            text: replyTo.text
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
                        src: message.mediaUrl || '',
                        alt: 'Image'
                    }
                });
                img.addEventListener('click', () => {
                    (window as any).app.openImage(message.mediaUrl);
                });
                mediaDiv.appendChild(img);
                break;

            case 'video':
                const video = createElement('video', {
                    attributes: {
                        src: message.mediaUrl || '',
                        controls: 'true'
                    }
                });
                mediaDiv.appendChild(video);
                break;

            case 'voice':
                mediaDiv.textContent = `🎤 Голосовое сообщение ${message.duration || '0:00'}`;
                break;

            case 'file':
                const fileDiv = createElement('div', {
                    className: 'file-message',
                    text: `📎 ${message.fileName} (${message.fileSize})`
                });
                fileDiv.addEventListener('click', () => {
                    window.open(message.mediaUrl);
                });
                return fileDiv;

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
            const emptyMessages = createElement('div', { className: 'empty-messages' });
            const emptyText = createElement('p', {
                text: 'Нет сообщений. Начните общение!'
            });
            emptyMessages.appendChild(emptyText);
            messagesArea.appendChild(emptyMessages);
        } else {
            messages.forEach(msg => {
                const isSent = msg.to === chat.username;
                const messageEl = this.renderMessage(msg, isSent);
                messagesArea.appendChild(messageEl);
            });
        }

        chatArea.appendChild(messagesArea);

        // Message input
        const inputContainer = this.createMessageInput();
        chatArea.appendChild(inputContainer);

        // Scroll to bottom
        setTimeout(() => {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 0);

        // Setup handlers
        this.setupMessageInputHandlers();
    }

    private createChatHeader(chat: Chat): HTMLElement {
        const [color1, color2] = getAvatarColor(chat.username);
        
        const header = createElement('div', { className: 'chat-header' });
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
        const chatName = createElement('div', { className: 'chat-name' });
        chatName.appendChild(createText(chat.username));
        const userIdSpan = createElement('span', {
            className: 'user-id',
            text: `#${chat.userId}`
        });
        chatName.appendChild(userIdSpan);

        const chatStatus = createElement('div', {
            className: 'chat-status',
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

        // Input
        const input = createElement('input', {
            id: 'messageInput',
            attributes: {
                type: 'text',
                placeholder: 'Введите сообщение...'
            }
        });

        // Send button
        const sendBtn = createElement('button', {
            id: 'sendBtn',
            className: 'send-btn'
        });
        const sendIcon = createSVGIcon('send', 20, 20);
        sendBtn.appendChild(sendIcon);

        inputContainer.appendChild(input);
        inputContainer.appendChild(sendBtn);
        messageInputArea.appendChild(inputContainer);

        return messageInputArea;
    }

    private setupMessageInputHandlers(): void {
        const input = document.getElementById('messageInput') as HTMLInputElement;
        const sendBtn = document.getElementById('sendBtn');

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
    }
}

export const uiManager = new UIManager();
