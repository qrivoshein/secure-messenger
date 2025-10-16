// UI Manager for DOM manipulation and component rendering

import { escapeHtml, formatTime, getAvatarColor } from '../utils/helpers';
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
        if (loginMsg) loginMsg.innerHTML = '';
        if (registerMsg) registerMsg.innerHTML = '';
    }

    showError(elementId: string, message: string): void {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
        }
    }

    showSuccess(elementId: string, message: string): void {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = `<div class="success-message">${escapeHtml(message)}</div>`;
        }
    }

    updateUserInfo(user: User): void {
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) {
            userNameEl.innerHTML = `${escapeHtml(user.username)}<span class="user-id">#${user.userId}</span>`;
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

        if (chats.length === 0) {
            chatsListEl.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <p style="text-align: center; color: #718096;">Нет чатов. Начните новый диалог!</p>
                </div>
            `;
            return;
        }

        const html = chats.map(chat => {
            const [color1, color2] = getAvatarColor(chat.username);
            const unreadBadge = chat.unreadCount ? 
                `<span class="unread-badge">${chat.unreadCount}</span>` : '';
            const onlineBadge = chat.online ? 
                '<div class="online-badge"></div>' : '';

            return `
                <div class="chat-item" data-username="${escapeHtml(chat.username)}" onclick="window.app.openChat('${escapeHtml(chat.username)}')">
                    <div class="chat-avatar" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);">
                        ${chat.username[0].toUpperCase()}
                        ${onlineBadge}
                    </div>
                    <div class="chat-info">
                        <div class="chat-header">
                            <div class="chat-name">
                                ${escapeHtml(chat.username)}
                                <span class="user-id">#${chat.userId}</span>
                            </div>
                            <div class="chat-time">${chat.time || ''}</div>
                        </div>
                        <div class="chat-preview">${chat.lastMessage || 'Начните общение'}</div>
                    </div>
                    ${unreadBadge}
                </div>
            `;
        }).join('');

        chatsListEl.innerHTML = html;
    }

    renderMessage(message: Message, isSent: boolean): string {
        const username = isSent ? 'Вы' : message.from;
        const [color1, color2] = getAvatarColor(username);
        const time = formatTime(message.time || message.timestamp);
        const sentClass = isSent ? 'sent' : '';

        // Reply quote if exists
        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = `
                <div class="message-reply-quote" onclick="window.app.scrollToMessage('${message.replyTo.id}')">
                    <div class="message-reply-content">
                        <div class="message-reply-sender">${escapeHtml(message.replyTo.from)}</div>
                        <div class="message-reply-text">${escapeHtml(message.replyTo.text)}</div>
                    </div>
                </div>
            `;
        }

        // Message content
        let contentHtml = '';
        if (message.mediaType) {
            contentHtml = this.renderMediaMessage(message);
        } else {
            const editedTag = message.edited ? '<span class="message-edited">(изменено)</span>' : '';
            contentHtml = `${escapeHtml(message.text)} ${editedTag}`;
        }

        return `
            <div class="message ${sentClass}" data-message-id="${message.id}">
                <div class="message-avatar" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);">
                    ${username[0].toUpperCase()}
                </div>
                <div class="message-content">
                    ${replyHtml}
                    <div class="message-bubble">
                        ${contentHtml}
                    </div>
                    <div class="message-time">
                        ${time}
                        ${isSent ? this.renderReadStatus(message.read) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    private renderMediaMessage(message: Message): string {
        // Simplified media rendering
        switch (message.mediaType) {
            case 'image':
                return `<div class="media-message"><img src="${message.mediaUrl}" alt="Image" onclick="window.app.openImage('${message.mediaUrl}')"></div>`;
            case 'video':
                return `<div class="media-message"><video src="${message.mediaUrl}" controls></video></div>`;
            case 'voice':
                return `<div class="voice-message">🎤 Голосовое сообщение ${message.duration || '0:00'}</div>`;
            case 'file':
                return `<div class="file-message" onclick="window.open('${message.mediaUrl}')">📎 ${message.fileName} (${message.fileSize})</div>`;
            default:
                return escapeHtml(message.text);
        }
    }

    private renderReadStatus(read?: boolean): string {
        if (read) {
            return `<span class="message-read-status"><svg width="14" height="14" class="read"><use href="#icon-check-double"></use></svg></span>`;
        }
        return `<span class="message-read-status"><svg width="14" height="14"><use href="#icon-check-single"></use></svg></span>`;
    }

    appendMessage(html: string): void {
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const messageEl = temp.firstElementChild;
            if (messageEl) {
                messagesArea.appendChild(messageEl);
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }
    }

    clearChatArea(): void {
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><svg class="icon-svg" width="80" height="80" style="color: #718096;"><use href="#icon-chat"></use></svg></div>
                    <h3>Выберите чат</h3>
                    <p>Выберите пользователя из списка слева, чтобы начать общение</p>
                </div>
            `;
        }
    }

    setButtonLoading(buttonId: string, loading: boolean, originalText?: string): void {
        const btn = document.getElementById(buttonId) as HTMLButtonElement;
        if (btn) {
            btn.disabled = loading;
            if (loading && originalText) {
                btn.textContent = originalText;
            }
        }
    }
}

export const uiManager = new UIManager();
