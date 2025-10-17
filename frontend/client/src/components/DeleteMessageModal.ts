import { createElement } from '../utils/dom-helpers';

export interface DeleteMessageOptions {
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
    onCancel: () => void;
}

export class DeleteMessageModal {
    private modal: HTMLElement | null = null;
    private isVisible: boolean = false;

    create(): HTMLElement {
        this.modal = createElement('div', {
            id: 'deleteMessageModal',
            className: 'delete-message-modal',
            styles: {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: '10001',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });

        document.body.appendChild(this.modal);
        return this.modal;
    }

    show(canDeleteForEveryone: boolean, options: DeleteMessageOptions): void {
        if (!this.modal) return;

        // Clear previous content
        this.modal.innerHTML = '';

        const modalContent = createElement('div', {
            className: 'delete-modal-content',
            styles: {
                background: '#1a2332',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '400px',
                padding: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }
        });

        const title = createElement('h3', {
            text: 'Удалить сообщение',
            styles: {
                fontSize: '20px',
                fontWeight: '600',
                color: '#e1e9f0',
                margin: '0 0 16px 0'
            }
        });

        const description = createElement('p', {
            text: 'Выберите способ удаления сообщения:',
            styles: {
                fontSize: '14px',
                color: '#a0aec0',
                margin: '0 0 20px 0'
            }
        });

        // Delete for me button
        const deleteForMeBtn = createElement('button', {
            className: 'delete-option-btn',
            text: 'Удалить у себя',
            styles: {
                width: '100%',
                padding: '14px',
                background: '#2d3748',
                color: '#e1e9f0',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '12px',
                transition: 'all 0.2s'
            }
        });

        deleteForMeBtn.addEventListener('mouseenter', () => {
            deleteForMeBtn.style.background = '#374151';
        });

        deleteForMeBtn.addEventListener('mouseleave', () => {
            deleteForMeBtn.style.background = '#2d3748';
        });

        deleteForMeBtn.addEventListener('click', () => {
            options.onDeleteForMe();
            this.hide();
        });

        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(deleteForMeBtn);

        // Delete for everyone button (only if sender)
        if (canDeleteForEveryone) {
            const deleteForEveryoneBtn = createElement('button', {
                className: 'delete-option-btn',
                text: 'Удалить у всех',
                styles: {
                    width: '100%',
                    padding: '14px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginBottom: '12px',
                    transition: 'all 0.2s'
                }
            });

            deleteForEveryoneBtn.addEventListener('mouseenter', () => {
                deleteForEveryoneBtn.style.background = '#b91c1c';
            });

            deleteForEveryoneBtn.addEventListener('mouseleave', () => {
                deleteForEveryoneBtn.style.background = '#dc2626';
            });

            deleteForEveryoneBtn.addEventListener('click', () => {
                options.onDeleteForEveryone();
                this.hide();
            });

            modalContent.appendChild(deleteForEveryoneBtn);
        }

        // Cancel button
        const cancelBtn = createElement('button', {
            className: 'cancel-btn',
            text: 'Отмена',
            styles: {
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }
        });

        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(102, 126, 234, 0.1)';
        });

        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'transparent';
        });

        cancelBtn.addEventListener('click', () => {
            options.onCancel();
            this.hide();
        });

        modalContent.appendChild(cancelBtn);
        this.modal.appendChild(modalContent);

        // Show modal
        this.modal.style.display = 'flex';
        this.isVisible = true;

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                options.onCancel();
                this.hide();
            }
        });

        // Close on Escape
        const closeOnEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isVisible) {
                options.onCancel();
                this.hide();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    hide(): void {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.isVisible = false;
        }
    }

    destroy(): void {
        this.modal?.remove();
    }
}

export const deleteMessageModal = new DeleteMessageModal();
