// Context menu for messages

import { createElement } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';

export interface MessageContextMenuOptions {
    onReply?: () => void;
    onForward?: () => void;
    onEdit?: () => void;
    onPin?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
}

export class MessageContextMenu {
    private menu: HTMLElement | null = null;
    private isVisible: boolean = false;

    create(): HTMLElement {
        this.menu = createElement('div', {
            className: 'message-context-menu',
            styles: {
                position: 'fixed',
                display: 'none',
                background: '#1a2332',
                border: '1px solid #2d3748',
                borderRadius: '8px',
                padding: '4px',
                zIndex: '10000',
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.menu && !this.menu.contains(e.target as Node) && this.isVisible) {
                this.hide();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        document.body.appendChild(this.menu);
        return this.menu;
    }

    show(x: number, y: number, options: MessageContextMenuOptions): void {
        if (!this.menu) return;

        // Clear previous items
        this.menu.innerHTML = '';

        // Add menu items
        if (options.onReply) {
            this.menu.appendChild(this.createMenuItem('Ответить', 'reply', options.onReply));
        }

        if (options.onEdit) {
            this.menu.appendChild(this.createMenuItem('Редактировать', 'edit', options.onEdit));
        }

        if (options.onForward) {
            this.menu.appendChild(this.createMenuItem('Переслать', 'forward', options.onForward));
        }

        if (options.onPin) {
            this.menu.appendChild(this.createMenuItem('Закрепить', 'pin', options.onPin));
        }

        // Separator before delete
        if (options.onDelete) {
            this.menu.appendChild(this.createSeparator());
            this.menu.appendChild(this.createMenuItem('Удалить', 'trash', options.onDelete));
        }

        // Position menu
        this.menu.style.display = 'block';
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;

        // Adjust if menu goes off screen
        setTimeout(() => {
            if (!this.menu) return;
            
            const rect = this.menu.getBoundingClientRect();
            
            if (rect.right > window.innerWidth) {
                this.menu.style.left = `${x - rect.width}px`;
            }
            
            if (rect.bottom > window.innerHeight) {
                this.menu.style.top = `${y - rect.height}px`;
            }
        }, 0);

        this.isVisible = true;
    }

    hide(): void {
        if (this.menu) {
            this.menu.style.display = 'none';
            this.isVisible = false;
        }
    }

    private createMenuItem(label: string, icon: string, onClick: () => void): HTMLElement {
        const isDelete = label === 'Удалить';
        
        const item = createElement('div', {
            className: 'context-menu-item',
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'background 0.2s, color 0.2s',
                color: isDelete ? '#fc5c65' : '#e1e9f0',
                fontSize: '14px'
            }
        });

        const iconEl = createSVGIcon(icon as any, 16, 16);
        iconEl.style.flexShrink = '0';
        if (isDelete) {
            iconEl.style.color = '#fc5c65';
        }

        const labelEl = document.createTextNode(label);

        item.appendChild(iconEl);
        item.appendChild(labelEl);

        item.addEventListener('mouseenter', () => {
            item.style.background = isDelete ? 'rgba(252, 92, 101, 0.1)' : '#2d3748';
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });

        item.addEventListener('click', () => {
            onClick();
            this.hide();
        });

        return item;
    }

    private createSeparator(): HTMLElement {
        return createElement('div', {
            styles: {
                height: '1px',
                background: '#2d3748',
                margin: '6px 8px'
            }
        });
    }

    destroy(): void {
        this.menu?.remove();
    }
}

export const messageContextMenu = new MessageContextMenu();
