// Audio player component with interactive waveform

import { createElement, createText } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import { AudioWaveform } from './AudioWaveform';

export interface AudioPlayerOptions {
    audioUrl: string;
    waveformData?: number[];
    duration?: number;
}

export class AudioPlayer {
    private container: HTMLElement | null = null;
    private audio: HTMLAudioElement | null = null;
    private playButton: HTMLElement | null = null;
    private timeDisplay: HTMLElement | null = null;
    private waveform: AudioWaveform | null = null;
    
    private isPlaying: boolean = false;
    private duration: number = 0;
    
    private options: AudioPlayerOptions;

    constructor(options: AudioPlayerOptions) {
        this.options = options;
        this.duration = options.duration || 0;
    }

    create(): HTMLElement {
        this.container = createElement('div', {
            className: 'audio-player',
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'transparent',
                borderRadius: '12px',
                maxWidth: '320px',
                minWidth: '240px'
            }
        });

        // Play/Pause button
        this.playButton = createElement('button', {
            className: 'audio-play-btn',
            attributes: {
                type: 'button',
                'aria-label': 'Play audio'
            },
            styles: {
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#4CAF50',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0',
                transition: 'all 0.2s ease'
            }
        });
        this.playButton.appendChild(createSVGIcon('play', 16, 16));
        this.playButton.addEventListener('click', this.togglePlayPause.bind(this));

        // Waveform and time container
        const contentContainer = createElement('div', {
            styles: {
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }
        });

        // Waveform
        this.waveform = new AudioWaveform({
            barCount: 30,
            barWidth: 3,
            barGap: 2,
            maxHeight: 24,
            color: '#4CAF50',
            interactive: true
        });

        const waveformElement = this.waveform.create();
        waveformElement.addEventListener('waveform-seek', this.handleSeek.bind(this));

        // Time display
        this.timeDisplay = createElement('div', {
            className: 'audio-time',
            text: this.formatTime(this.duration),
            styles: {
                fontSize: '12px',
                color: '#666',
                fontVariantNumeric: 'tabular-nums'
            }
        });

        contentContainer.appendChild(waveformElement);
        contentContainer.appendChild(this.timeDisplay);

        this.container.appendChild(this.playButton);
        this.container.appendChild(contentContainer);

        // Setup audio element
        this.setupAudio();

        // Set waveform data
        if (this.options.waveformData && this.options.waveformData.length > 0) {
            this.waveform.setWaveformData(this.options.waveformData);
        } else {
            this.waveform.generateRandomWaveform();
        }

        return this.container;
    }

    private setupAudio(): void {
        this.audio = new Audio(this.options.audioUrl);
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.duration = this.audio!.duration;
            this.updateTimeDisplay();
        });

        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this.waveform?.setProgress(0);
            if (this.audio) {
                this.audio.currentTime = 0;
            }
            this.updateTimeDisplay();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            alert('Ошибка воспроизведения аудио');
        });

        // Preload
        this.audio.preload = 'metadata';
    }

    private async togglePlayPause(): Promise<void> {
        if (!this.audio) return;

        try {
            if (this.isPlaying) {
                this.audio.pause();
                this.isPlaying = false;
            } else {
                await this.audio.play();
                this.isPlaying = true;
            }
            this.updatePlayButton();
        } catch (error) {
            console.error('Failed to toggle playback:', error);
        }
    }

    private updatePlayButton(): void {
        if (!this.playButton) return;

        // Clear existing icon
        this.playButton.innerHTML = '';

        if (this.isPlaying) {
            this.playButton.appendChild(createSVGIcon('pause', 16, 16));
            this.playButton.setAttribute('aria-label', 'Pause audio');
        } else {
            this.playButton.appendChild(createSVGIcon('play', 16, 16));
            this.playButton.setAttribute('aria-label', 'Play audio');
        }
    }

    private updateProgress(): void {
        if (!this.audio || !this.waveform) return;

        const progress = this.audio.currentTime / this.audio.duration;
        this.waveform.setProgress(progress);
        this.updateTimeDisplay();
    }

    private updateTimeDisplay(): void {
        if (!this.audio || !this.timeDisplay) return;

        const currentTime = this.audio.currentTime;
        const remainingTime = this.duration - currentTime;
        
        if (this.isPlaying) {
            // Show remaining time while playing
            this.timeDisplay.textContent = `-${this.formatTime(remainingTime)}`;
        } else {
            // Show total duration when paused/stopped
            this.timeDisplay.textContent = this.formatTime(this.duration);
        }
    }

    private handleSeek(event: Event): void {
        const customEvent = event as CustomEvent<{ progress: number }>;
        const progress = customEvent.detail.progress;

        if (this.audio) {
            this.audio.currentTime = progress * this.audio.duration;
        }
    }

    private formatTime(seconds: number): string {
        if (isNaN(seconds) || !isFinite(seconds)) {
            return '0:00';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Public methods
    play(): void {
        if (this.audio && !this.isPlaying) {
            this.togglePlayPause();
        }
    }

    pause(): void {
        if (this.audio && this.isPlaying) {
            this.togglePlayPause();
        }
    }

    stop(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            this.updatePlayButton();
            this.waveform?.setProgress(0);
            this.updateTimeDisplay();
        }
    }

    destroy(): void {
        this.stop();
        this.audio?.remove();
        this.waveform?.destroy();
        this.container?.remove();
    }
}
