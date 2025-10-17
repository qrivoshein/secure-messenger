import { createElement } from '../utils/dom-helpers';

export interface SelectionAppBarActions {
    onDelete: () => void;
    onForward: () => void;
    onCancel: () => void;
}

export class SelectionAppBar {
    private appBar: HTMLElement | null = null;
    private countElement: HTMLElement | null = null;
    private isVisible: boolean = false;

    create(): HTMLElement {
        this.appBar = createElement('div', {
            id: 'selectionAppBar',
            className: 'selection-app-bar',
            styles: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                height: '60px',
                background: '#1a2332',
                borderBottom: '1px solid #2d3748',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: '1000',
                transform: 'translateY(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }
        });

        // Left section with count
        const leftSection = createElement('div', {
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }
        });

        const cancelBtn = createElement('button', {
            className: 'selection-cancel-btn',
            text: '×',
            styles: {
                background: 'transparent',
                border: 'none',
                color: '#e1e9f0',
                fontSize: '32px',
                cursor: 'pointer',
                padding: '0',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s'
            }
        });

        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });

        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'transparent';
        });

        this.countElement = createElement('div', {
            className: 'selection-count',
            text: '0',
            styles: {
                fontSize: '20px',
                fontWeight: '600',
                color: '#e1e9f0'
            }
        });

        leftSection.appendChild(cancelBtn);
        leftSection.appendChild(this.countElement);

        // Right section with actions
        const rightSection = createElement('div', {
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });

        const deleteBtn = createElement('button', {
            className: 'selection-action-btn',
            text: '🗑️',
            styles: {
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
            }
        });

        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
        });

        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'transparent';
        });

        const forwardBtn = createElement('button', {
            className: 'selection-action-btn',
            text: '➤',
            styles: {
                background: 'transparent',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
            }
        });

        forwardBtn.addEventListener('mouseenter', () => {
            forwardBtn.style.background = 'rgba(102, 126, 234, 0.1)';
        });

        forwardBtn.addEventListener('mouseleave', () => {
            forwardBtn.style.background = 'transparent';
        });

        rightSection.appendChild(forwardBtn);
        rightSection.appendChild(deleteBtn);

        this.appBar.appendChild(leftSection);
        this.appBar.appendChild(rightSection);

        return this.appBar;
    }

    show(count: number, actions: SelectionAppBarActions): void {
        if (!this.appBar || !this.countElement) return;

        this.updateCount(count);
        this.appBar.style.display = 'flex';
        
        // Trigger reflow
        this.appBar.offsetHeight;
        
        this.appBar.style.transform = 'translateY(0)';
        this.isVisible = true;

        // Setup event listeners
        const cancelBtn = this.appBar.querySelector('.selection-cancel-btn');
        const deleteBtn = this.appBar.querySelector('.selection-action-btn:last-child');
        const forwardBtn = this.appBar.querySelector('.selection-action-btn:first-child');

        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            const newCancelBtn = this.appBar.querySelector('.selection-cancel-btn');
            newCancelBtn?.addEventListener('click', actions.onCancel);
        }

        if (deleteBtn) {
            deleteBtn.replaceWith(deleteBtn.cloneNode(true));
            const newDeleteBtn = this.appBar.querySelector('.selection-action-btn:last-child');
            newDeleteBtn?.addEventListener('click', actions.onDelete);
        }

        if (forwardBtn) {
            forwardBtn.replaceWith(forwardBtn.cloneNode(true));
            const newForwardBtn = this.appBar.querySelector('.selection-action-btn:first-child');
            newForwardBtn?.addEventListener('click', actions.onForward);
        }

        // Shift chat area down
        const chatArea = document.querySelector('.chat-area') as HTMLElement;
        if (chatArea) {
            chatArea.style.paddingTop = '60px';
            chatArea.style.transition = 'padding-top 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    }

    hide(): void {
        if (!this.appBar) return;

        this.appBar.style.transform = 'translateY(-100%)';
        this.isVisible = false;

        setTimeout(() => {
            if (this.appBar) {
                this.appBar.style.display = 'none';
            }
        }, 300);

        // Reset chat area padding
        const chatArea = document.querySelector('.chat-area') as HTMLElement;
        if (chatArea) {
            chatArea.style.paddingTop = '0';
        }
    }

    updateCount(count: number): void {
        if (this.countElement) {
            this.countElement.textContent = count.toString();
        }
    }

    isShowing(): boolean {
        return this.isVisible;
    }
}

export const selectionAppBar = new SelectionAppBar();
