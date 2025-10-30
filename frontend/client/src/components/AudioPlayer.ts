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
                backgroundColor: '#667eea',
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
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px'
            }
        });

        // Waveform
        this.waveform = new AudioWaveform({
            barCount: 30,
            barWidth: 3,
            barGap: 2,
            maxHeight: 24,
            color: '#667eea',
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
                fontVariantNumeric: 'tabular-nums',
                flexShrink: '0',
                minWidth: '40px'
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
        this.audio = new Audio();
        
        // Set CORS for cross-origin audio
        this.audio.crossOrigin = 'anonymous';
        
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
            const fileExtension = this.options.audioUrl.split('.').pop();
            
            console.error('Audio playback error:', e, this.audio?.error);
            console.error('Audio URL:', this.options.audioUrl);
            console.error('File extension:', fileExtension);
            console.error('Audio src:', this.audio?.src);
            console.error('Audio networkState:', this.audio?.networkState);
            console.error('Audio readyState:', this.audio?.readyState);
            
            const errorDetails = this.audio?.error;
            let errorMessage = 'Ошибка воспроизведения аудио';
            
            if (errorDetails) {
                console.error('MediaError code:', errorDetails.code);
                console.error('MediaError message:', errorDetails.message);
                
                switch(errorDetails.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        errorMessage = 'Воспроизведение прервано';
                        break;
                    case MediaError.MEDIA_ERR_NETWORK:
                        errorMessage = 'Ошибка сети при загрузке аудио';
                        break;
                    case MediaError.MEDIA_ERR_DECODE:
                        errorMessage = 'Ошибка декодирования аудио. Возможно, файл поврежден.';
                        console.error('Decode error - file may be corrupted or format unsupported');
                        break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        // Check if it's an old .m4a file that Safari can't play
                        if (fileExtension === 'm4a') {
                            errorMessage = 'Старый формат голосового сообщения не поддерживается. Новые сообщения будут в поддерживаемом формате.';
                            console.warn('Legacy .m4a file detected - Safari cannot play it. New recordings use WAV format.');
                        } else {
                            errorMessage = 'Формат аудио не поддерживается браузером.';
                        }
                        console.error('Format not supported. File extension:', fileExtension);
                        break;
                }
            }
            
            console.error('Audio error details:', errorMessage);
            
            // Show error in UI instead of alert
            if (this.container && errorDetails?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                // Replace player with error message
                this.container.innerHTML = '';
                this.container.style.padding = '12px 16px';
                this.container.style.background = 'rgba(239, 68, 68, 0.1)';
                this.container.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                this.container.style.borderRadius = '12px';
                this.container.style.color = '#ef4444';
                this.container.style.fontSize = '13px';
                this.container.textContent = fileExtension === 'm4a' 
                    ? '⚠️ Старый формат не поддерживается' 
                    : '⚠️ Формат не поддерживается';
            }
            
            // Don't show alert in production, just log
            if (window.location.hostname === 'localhost') {
                alert(errorMessage);
            }
        });

        this.audio.addEventListener('canplaythrough', () => {
            console.log('Audio can play through');
        });

        // Preload and set source
        this.audio.preload = 'metadata';
        
        // Log audio URL for debugging
        console.log('Setting up audio player for:', this.options.audioUrl);
        
        // For Safari with direct URLs, add Authorization header via fetch
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isDirectUrl = !this.options.audioUrl.startsWith('blob:');
        
        if (isSafari && isDirectUrl) {
            console.log('Safari + direct URL: fetching with auth and creating blob');
            const token = localStorage.getItem('token');
            
            fetch(this.options.audioUrl, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            .then(async response => {
                console.log('Fetch response:', response.status, response.headers.get('content-type'));
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const contentType = response.headers.get('content-type') || 'audio/mp4';
                const blob = await response.blob();
                
                // Create blob with explicit type
                const typedBlob = new Blob([blob], { type: contentType });
                const blobUrl = URL.createObjectURL(typedBlob);
                
                console.log(`Created typed blob: ${typedBlob.size} bytes, type: ${typedBlob.type}`);
                
                this.audio!.src = blobUrl;
                this.audio!.load();
            })
            .catch(err => {
                console.error('Failed to load audio for Safari:', err);
                this.audio!.src = this.options.audioUrl;
                this.audio!.load();
            });
        } else {
            // Fetch headers to verify server response
            fetch(this.options.audioUrl, { method: 'HEAD' })
                .then(response => {
                    console.log('Audio file headers:');
                    console.log('  Content-Type:', response.headers.get('content-type'));
                    console.log('  Content-Length:', response.headers.get('content-length'));
                    console.log('  Accept-Ranges:', response.headers.get('accept-ranges'));
                    console.log('  Status:', response.status);
                })
                .catch(err => console.error('Failed to fetch audio headers:', err));
            
            this.audio.src = this.options.audioUrl;
            this.audio.load();
        }
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
