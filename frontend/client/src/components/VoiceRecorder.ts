// Voice recorder component with Telegram-style UI

import { createElement, createText } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import { AudioWaveform } from './AudioWaveform';
import { audioService } from '../services/audio.service';

export interface VoiceRecorderCallbacks {
    onRecordComplete?: (audioBlob: Blob, waveformData: number[]) => void;
    onCancel?: () => void;
}

export class VoiceRecorder {
    private container: HTMLElement | null = null;
    private recordButton: HTMLElement | null = null;
    private recordingOverlay: HTMLElement | null = null;
    private timerElement: HTMLElement | null = null;
    private waveform: AudioWaveform | null = null;
    private cancelZone: HTMLElement | null = null;
    
    private isRecording: boolean = false;
    private startTime: number = 0;
    private timerInterval: number | null = null;
    private animationFrame: number | null = null;
    
    // Touch/swipe tracking
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private isDragging: boolean = false;
    
    private callbacks: VoiceRecorderCallbacks;

    constructor(callbacks: VoiceRecorderCallbacks = {}) {
        this.callbacks = callbacks;
    }

    createRecordButton(): HTMLElement {
        this.recordButton = createElement('button', {
            className: 'voice-record-btn',
            attributes: {
                type: 'button',
                'aria-label': 'Record voice message'
            },
            styles: {
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid #2d3748',
                backgroundColor: '#1a2332',
                color: '#e1e9f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: '0'
            }
        });

        const icon = createSVGIcon('microphone', 20, 20);
        this.recordButton.appendChild(icon);

        // Desktop: click to toggle
        this.recordButton.addEventListener('click', this.handleDesktopClick.bind(this));
        
        // Mobile: press and hold
        this.recordButton.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.recordButton.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.recordButton.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.recordButton.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

        return this.recordButton;
    }

    private createRecordingOverlay(): HTMLElement {
        this.recordingOverlay = createElement('div', {
            className: 'voice-recording-overlay',
            styles: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '10000',
                backdropFilter: 'blur(2px)'
            }
        });

        const content = createElement('div', {
            className: 'recording-content',
            styles: {
                backgroundColor: '#1a2332',
                borderRadius: '16px',
                padding: '32px',
                minWidth: '320px',
                maxWidth: '90vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                position: 'relative'
            }
        });

        // Header with timer
        const header = createElement('div', {
            styles: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }
        });

        const recordingIndicator = createElement('div', {
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });

        const redDot = createElement('div', {
            className: 'recording-pulse',
            styles: {
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#f44336',
                animation: 'pulse 1.5s ease-in-out infinite'
            }
        });

        this.timerElement = createElement('span', {
            className: 'recording-timer',
            text: '0:00',
            styles: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#e1e9f0',
                fontVariantNumeric: 'tabular-nums'
            }
        });

        recordingIndicator.appendChild(redDot);
        recordingIndicator.appendChild(this.timerElement);
        header.appendChild(recordingIndicator);

        // Waveform
        this.waveform = new AudioWaveform({
            barCount: 40,
            barWidth: 3,
            barGap: 2,
            maxHeight: 32,
            color: '#4CAF50'
        });

        const waveformContainer = createElement('div', {
            styles: {
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#0e1621',
                borderRadius: '12px'
            }
        });
        waveformContainer.appendChild(this.waveform.create());

        // Cancel instruction
        this.cancelZone = createElement('div', {
            className: 'cancel-zone',
            styles: {
                textAlign: 'center',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            }
        });
        this.cancelZone.appendChild(createSVGIcon('arrowLeft', 16, 16));
        this.cancelZone.appendChild(createText(' Свайп влево для отмены'));

        // Action buttons
        const actions = createElement('div', {
            styles: {
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
            }
        });

        const cancelBtn = createElement('button', {
            className: 'recording-cancel-btn',
            styles: {
                padding: '12px 24px',
                borderRadius: '8px',
                border: '2px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });
        cancelBtn.appendChild(createSVGIcon('close', 18, 18));
        cancelBtn.appendChild(createText('Отмена'));
        cancelBtn.addEventListener('click', this.cancelRecording.bind(this));

        const stopBtn = createElement('button', {
            className: 'recording-stop-btn',
            styles: {
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4CAF50',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });
        stopBtn.appendChild(createSVGIcon('check', 18, 18));
        stopBtn.appendChild(createText('Готово'));
        stopBtn.addEventListener('click', this.stopRecording.bind(this));

        actions.appendChild(cancelBtn);
        actions.appendChild(stopBtn);

        content.appendChild(header);
        content.appendChild(waveformContainer);
        content.appendChild(this.cancelZone);
        content.appendChild(actions);

        this.recordingOverlay.appendChild(content);

        // Add to document
        document.body.appendChild(this.recordingOverlay);

        return this.recordingOverlay;
    }

    private async handleDesktopClick(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        if (!this.isRecording) {
            await this.startRecording();
        } else {
            await this.stopRecording();
        }
    }

    private async handleTouchStart(e: TouchEvent): Promise<void> {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isDragging = false;

        await this.startRecording();
    }

    private handleTouchMove(e: TouchEvent): void {
        if (!this.isRecording) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;

        // Check for left swipe (cancel)
        if (deltaX < -50 && Math.abs(deltaY) < 50) {
            this.isDragging = true;
            if (this.cancelZone) {
                this.cancelZone.style.opacity = '1';
            }
        }

        // Cancel if swiped far enough
        if (deltaX < -100) {
            this.cancelRecording();
        }
    }

    private async handleTouchEnd(e: TouchEvent): Promise<void> {
        if (!this.isRecording) return;

        if (!this.isDragging) {
            // Normal tap - stop recording
            await this.stopRecording();
        }

        this.isDragging = false;
    }

    private async startRecording(): Promise<void> {
        try {
            await audioService.startRecording();
            
            this.isRecording = true;
            this.startTime = Date.now();

            // Create and show overlay
            if (!this.recordingOverlay) {
                this.createRecordingOverlay();
            }
            if (this.recordingOverlay) {
                this.recordingOverlay.style.display = 'flex';
            }

            // Update button state
            if (this.recordButton) {
                this.recordButton.style.backgroundColor = '#f44336';
                this.recordButton.style.transform = 'scale(1.1)';
            }

            // Start timer
            this.startTimer();

            // Start waveform animation
            this.animateWaveform();

        } catch (error: any) {
            console.error('Failed to start recording:', error);
            alert(error.message || 'Не удалось получить доступ к микрофону');
        }
    }

    private async stopRecording(): Promise<void> {
        if (!this.isRecording) return;

        try {
            const audioBlob = await audioService.stopRecording();
            const waveformData = this.waveform?.getWaveformData() || [];

            this.cleanup();

            // Call callback
            if (this.callbacks.onRecordComplete) {
                this.callbacks.onRecordComplete(audioBlob, waveformData);
            }

        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.cleanup();
        }
    }

    private cancelRecording(): void {
        audioService.cancelRecording();
        this.cleanup();

        if (this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            if (this.timerElement) {
                this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Auto-stop at 5 minutes
            if (elapsed >= 300) {
                this.stopRecording();
            }
        }, 100);
    }

    private animateWaveform(): void {
        if (!this.isRecording) return;

        const analyser = audioService.getAnalyser();
        if (analyser && this.waveform) {
            this.waveform.updateFromAnalyser(analyser);
        }

        this.animationFrame = requestAnimationFrame(this.animateWaveform.bind(this));
    }

    private cleanup(): void {
        this.isRecording = false;

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Stop animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Hide overlay
        if (this.recordingOverlay) {
            this.recordingOverlay.style.display = 'none';
        }

        // Reset button
        if (this.recordButton) {
            this.recordButton.style.backgroundColor = '#1a2332';
            this.recordButton.style.transform = 'scale(1)';
        }

        // Reset cancel zone
        if (this.cancelZone) {
            this.cancelZone.style.opacity = '0';
        }

        // Reset waveform
        this.waveform?.reset();
    }

    destroy(): void {
        this.cleanup();
        this.recordingOverlay?.remove();
        this.waveform?.destroy();
    }
}
