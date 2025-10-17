import { createElement, createText, clearElement } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import { getAvatarColor } from '../utils/helpers';
import type { User } from '../types';

export class NewChatModal {
    private modal: HTMLElement | null = null;
    private onUserSelect: ((username: string) => void) | null = null;
    private allUsers: User[] = [];

    create(): HTMLElement {
        this.modal = createElement('div', {
            id: 'newChatModal',
            className: 'new-chat-modal',
            styles: {
                display: 'none',
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: '10000',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });

        const modalContent = createElement('div', {
            className: 'new-chat-modal-content',
            styles: {
                background: '#1a2332',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }
        });

        // Header
        const header = createElement('div', {
            className: 'new-chat-modal-header',
            styles: {
                padding: '20px 24px',
                borderBottom: '1px solid #2d3748',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }
        });

        const title = createElement('h3', {
            text: 'Новый чат',
            styles: {
                fontSize: '20px',
                fontWeight: '600',
                color: '#e1e9f0',
                margin: '0'
            }
        });

        const closeBtn = createElement('button', {
            className: 'new-chat-modal-close',
            styles: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'transparent',
                border: '1px solid #2d3748',
                color: '#e1e9f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
            }
        });
        closeBtn.appendChild(createSVGIcon('close', 18, 18));
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Search box
        const searchBox = createElement('div', {
            className: 'new-chat-search',
            styles: {
                padding: '16px 24px',
                borderBottom: '1px solid #2d3748'
            }
        });

        const searchInput = createElement('input', {
            id: 'newChatSearchInput',
            attributes: {
                type: 'text',
                placeholder: 'ID пользователя',
                autocomplete: 'off',
                inputmode: 'numeric',
                pattern: '[0-9]*'
            },
            styles: {
                width: '100%',
                padding: '12px 16px',
                background: '#0e1621',
                border: '1px solid #2d3748',
                borderRadius: '10px',
                color: '#e1e9f0',
                fontSize: '15px',
                outline: 'none'
            }
        }) as HTMLInputElement;

        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#667eea';
        });

        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#2d3748';
        });

        // Only allow digits
        searchInput.addEventListener('keypress', (e) => {
            const charCode = e.charCode;
            // Allow only digits (0-9)
            if (charCode < 48 || charCode > 57) {
                e.preventDefault();
            }
        });

        // Also filter on paste
        searchInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            const digitsOnly = pastedText.replace(/\D/g, '');
            searchInput.value = digitsOnly;
            this.filterUsers(digitsOnly);
        });

        searchInput.addEventListener('input', () => {
            // Remove any non-digit characters
            searchInput.value = searchInput.value.replace(/\D/g, '');
            this.filterUsers(searchInput.value);
        });

        searchBox.appendChild(searchInput);

        // Users list
        const usersList = createElement('div', {
            id: 'newChatUsersList',
            className: 'new-chat-users-list',
            styles: {
                flex: '1',
                overflowY: 'auto',
                padding: '8px 0'
            }
        });

        modalContent.appendChild(header);
        modalContent.appendChild(searchBox);
        modalContent.appendChild(usersList);

        this.modal.appendChild(modalContent);

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.style.display !== 'none') {
                this.hide();
            }
        });

        return this.modal;
    }

    show(users: User[], onSelect: (username: string) => void): void {
        this.allUsers = users;
        this.onUserSelect = onSelect;
        
        if (this.modal) {
            this.modal.style.display = 'flex';
            // Don't show any users initially - show empty state
            this.renderUsers([]);
            
            // Focus search input
            setTimeout(() => {
                const input = document.getElementById('newChatSearchInput') as HTMLInputElement;
                if (input) input.focus();
            }, 100);
        }
    }

    hide(): void {
        if (this.modal) {
            this.modal.style.display = 'none';
            
            // Clear search
            const input = document.getElementById('newChatSearchInput') as HTMLInputElement;
            if (input) input.value = '';
        }
    }

    private renderUsers(users: User[]): void {
        const usersList = document.getElementById('newChatUsersList');
        if (!usersList) return;

        clearElement(usersList);

        if (users.length === 0) {
            const emptyState = createElement('div', {
                styles: {
                    padding: '40px 24px',
                    textAlign: 'center',
                    color: '#718096'
                }
            });
            
            const input = document.getElementById('newChatSearchInput') as HTMLInputElement;
            const inputValue = input?.value || '';
            
            let emptyText;
            if (inputValue.length === 0) {
                emptyText = createElement('p', {
                    text: 'Введите ID пользователя (5 цифр)',
                    styles: {
                        fontSize: '14px'
                    }
                });
            } else if (inputValue.length < 5) {
                emptyText = createElement('p', {
                    text: 'Введите минимум 5 цифр для поиска',
                    styles: {
                        fontSize: '14px'
                    }
                });
            } else {
                emptyText = createElement('p', {
                    text: 'Пользователь не найден',
                    styles: {
                        fontSize: '14px'
                    }
                });
            }
            
            emptyState.appendChild(emptyText);
            usersList.appendChild(emptyState);
            return;
        }

        users.forEach(user => {
            const userItem = this.createUserItem(user);
            usersList.appendChild(userItem);
        });
    }

    private createUserItem(user: User): HTMLElement {
        const [color1, color2] = getAvatarColor(user.username);

        const userItem = createElement('div', {
            className: 'new-chat-user-item',
            styles: {
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s'
            }
        });

        userItem.addEventListener('mouseenter', () => {
            userItem.style.background = '#151e2b';
        });

        userItem.addEventListener('mouseleave', () => {
            userItem.style.background = 'transparent';
        });

        userItem.addEventListener('click', () => {
            if (this.onUserSelect) {
                this.onUserSelect(user.username);
                this.hide();
            }
        });

        // Avatar
        const avatar = createElement('div', {
            className: 'user-avatar',
            text: user.username[0].toUpperCase(),
            styles: {
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                flexShrink: '0'
            }
        });

        // User info
        const userInfo = createElement('div', {
            styles: {
                flex: '1',
                minWidth: '0'
            }
        });

        const username = createElement('div', {
            text: user.username,
            styles: {
                fontSize: '15px',
                fontWeight: '500',
                color: '#e1e9f0',
                marginBottom: '2px'
            }
        });

        const userId = createElement('div', {
            text: `ID: ${user.userId}`,
            styles: {
                fontSize: '12px',
                color: '#718096'
            }
        });

        userInfo.appendChild(username);
        userInfo.appendChild(userId);

        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);

        return userItem;
    }

    private filterUsers(query: string): void {
        // Show nothing if query is empty
        if (!query.trim()) {
            this.renderUsers([]);
            return;
        }
        
        // Only search if at least 5 digits entered
        if (query.length < 5) {
            this.renderUsers([]);
            return;
        }
        
        const searchQuery = query.trim();
        // Search only by userId (exact match or contains)
        const filtered = this.allUsers.filter(user => {
            const userId = String(user.userId);
            return userId.includes(searchQuery);
        });
        
        console.log('Search by ID:', searchQuery);
        console.log('Found users:', filtered.map(u => ({ username: u.username, userId: u.userId })));
        
        this.renderUsers(filtered);
    }
}

export const newChatModal = new NewChatModal();
