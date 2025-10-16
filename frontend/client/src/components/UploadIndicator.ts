import { createElement, createText, clearElement } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';

export class UploadIndicator {
    private indicator: HTMLElement | null = null;

    show(fileName: string): void {
        // Remove existing if any
        this.hide();

        this.indicator = createElement('div', {
            className: 'upload-indicator',
            styles: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: '#1a2332',
                border: '1px solid #2d3748',
                borderRadius: '12px',
                padding: '16px 20px',
                minWidth: '280px',
                maxWidth: '400px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: '9999',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'slideInRight 0.3s ease'
            }
        });

        // Icon
        const iconWrapper = createElement('div', {
            styles: {
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(102, 126, 234, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0'
            }
        });
        const icon = createSVGIcon('image', 20, 20);
        icon.style.color = '#667eea';
        iconWrapper.appendChild(icon);

        // Content
        const content = createElement('div', {
            styles: {
                flex: '1',
                minWidth: '0'
            }
        });

        const title = createElement('div', {
            text: 'Загрузка...',
            styles: {
                fontSize: '14px',
                fontWeight: '500',
                color: '#e1e9f0',
                marginBottom: '4px'
            }
        });

        const fileNameEl = createElement('div', {
            text: fileName,
            styles: {
                fontSize: '12px',
                color: '#718096',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        });

        // Progress bar
        const progressBar = createElement('div', {
            styles: {
                height: '4px',
                background: '#2d3748',
                borderRadius: '2px',
                marginTop: '8px',
                overflow: 'hidden'
            }
        });

        const progressFill = createElement('div', {
            className: 'upload-progress-fill',
            styles: {
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: '2px',
                width: '0%',
                transition: 'width 0.3s ease',
                animation: 'progressPulse 1.5s ease-in-out infinite'
            }
        });

        progressBar.appendChild(progressFill);

        content.appendChild(title);
        content.appendChild(fileNameEl);
        content.appendChild(progressBar);

        this.indicator.appendChild(iconWrapper);
        this.indicator.appendChild(content);

        document.body.appendChild(this.indicator);

        // Animate progress
        setTimeout(() => {
            progressFill.style.width = '70%';
        }, 100);
    }

    showSuccess(fileName: string): void {
        if (!this.indicator) return;

        const content = this.indicator.querySelector('div:nth-child(2)') as HTMLElement;
        if (!content) return;

        clearElement(content);

        const title = createElement('div', {
            text: '✓ Загружено',
            styles: {
                fontSize: '14px',
                fontWeight: '500',
                color: '#4ecca3',
                marginBottom: '4px'
            }
        });

        const fileNameEl = createElement('div', {
            text: fileName,
            styles: {
                fontSize: '12px',
                color: '#718096',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        });

        content.appendChild(title);
        content.appendChild(fileNameEl);

        // Change icon color
        const icon = this.indicator.querySelector('svg');
        if (icon) icon.style.color = '#4ecca3';

        // Auto hide after 2 seconds
        setTimeout(() => {
            this.hide();
        }, 2000);
    }

    showError(message: string): void {
        if (!this.indicator) return;

        const content = this.indicator.querySelector('div:nth-child(2)') as HTMLElement;
        if (!content) return;

        clearElement(content);

        const title = createElement('div', {
            text: '✗ Ошибка',
            styles: {
                fontSize: '14px',
                fontWeight: '500',
                color: '#ef4444',
                marginBottom: '4px'
            }
        });

        const errorMsg = createElement('div', {
            text: message,
            styles: {
                fontSize: '12px',
                color: '#718096'
            }
        });

        content.appendChild(title);
        content.appendChild(errorMsg);

        // Change icon color
        const icon = this.indicator.querySelector('svg');
        if (icon) icon.style.color = '#ef4444';

        // Auto hide after 3 seconds
        setTimeout(() => {
            this.hide();
        }, 3000);
    }

    hide(): void {
        if (this.indicator) {
            this.indicator.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (this.indicator && this.indicator.parentNode) {
                    this.indicator.parentNode.removeChild(this.indicator);
                }
                this.indicator = null;
            }, 300);
        }
    }
}

export const uploadIndicator = new UploadIndicator();
