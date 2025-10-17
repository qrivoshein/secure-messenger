// Audio waveform visualization component (Telegram-style)

import { createElement } from '../utils/dom-helpers';

export interface WaveformOptions {
    barCount?: number;
    barWidth?: number;
    barGap?: number;
    barRadius?: number;
    minHeight?: number;
    maxHeight?: number;
    color?: string;
    interactive?: boolean;
}

export class AudioWaveform {
    private container: HTMLElement | null = null;
    private bars: HTMLElement[] = [];
    private waveformData: number[] = [];
    private options: Required<WaveformOptions>;
    private progressBar: HTMLElement | null = null;
    private currentProgress: number = 0;

    constructor(options: WaveformOptions = {}) {
        this.options = {
            barCount: options.barCount || 40,
            barWidth: options.barWidth || 3,
            barGap: options.barGap || 2,
            barRadius: options.barRadius || 2,
            minHeight: options.minHeight || 4,
            maxHeight: options.maxHeight || 32,
            color: options.color || '#4CAF50',
            interactive: options.interactive || false
        };
    }

    create(): HTMLElement {
        this.container = createElement('div', {
            className: 'audio-waveform',
            styles: {
                display: 'flex',
                alignItems: 'center',
                gap: `${this.options.barGap}px`,
                height: `${this.options.maxHeight}px`,
                position: 'relative',
                cursor: this.options.interactive ? 'pointer' : 'default'
            }
        });

        // Create bars
        for (let i = 0; i < this.options.barCount; i++) {
            const bar = createElement('div', {
                className: 'waveform-bar',
                styles: {
                    width: `${this.options.barWidth}px`,
                    height: `${this.options.minHeight}px`,
                    backgroundColor: this.options.color,
                    borderRadius: `${this.options.barRadius}px`,
                    transition: 'height 0.1s ease, opacity 0.2s ease',
                    opacity: '0.3'
                }
            });
            this.bars.push(bar);
            this.container.appendChild(bar);
        }

        // Add progress overlay for interactive mode
        if (this.options.interactive) {
            this.progressBar = createElement('div', {
                className: 'waveform-progress',
                styles: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    height: '100%',
                    width: '0%',
                    pointerEvents: 'none',
                    transition: 'width 0.1s linear'
                }
            });
            this.container.appendChild(this.progressBar);

            // Add click handler for seeking
            this.container.addEventListener('click', this.handleSeek.bind(this));
        }

        return this.container;
    }

    // Update waveform from live audio data
    updateFromAnalyser(analyser: AnalyserNode): void {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Sample the data to match bar count
        const step = Math.floor(dataArray.length / this.options.barCount);
        
        for (let i = 0; i < this.options.barCount; i++) {
            const index = i * step;
            const value = dataArray[index] / 255; // Normalize to 0-1
            
            // Calculate height with min/max bounds
            const height = this.options.minHeight + 
                          (value * (this.options.maxHeight - this.options.minHeight));
            
            if (this.bars[i]) {
                this.bars[i].style.height = `${height}px`;
                this.bars[i].style.opacity = value > 0.1 ? '1' : '0.3';
            }

            // Store for static display
            this.waveformData[i] = value;
        }
    }

    // Set static waveform data (for playback)
    setWaveformData(data: number[]): void {
        this.waveformData = data;
        
        // Resample if needed
        if (data.length !== this.options.barCount) {
            this.waveformData = this.resampleData(data, this.options.barCount);
        }

        this.renderStaticWaveform();
    }

    // Generate random waveform (for demo/placeholder)
    generateRandomWaveform(): void {
        this.waveformData = [];
        for (let i = 0; i < this.options.barCount; i++) {
            // Create more natural-looking random data
            const base = Math.random() * 0.6 + 0.2; // 0.2 to 0.8
            const variation = Math.sin(i / 3) * 0.2; // Add wave pattern
            this.waveformData.push(Math.max(0, Math.min(1, base + variation)));
        }
        this.renderStaticWaveform();
    }

    private renderStaticWaveform(): void {
        this.waveformData.forEach((value, i) => {
            if (this.bars[i]) {
                const height = this.options.minHeight + 
                              (value * (this.options.maxHeight - this.options.minHeight));
                this.bars[i].style.height = `${height}px`;
                this.bars[i].style.opacity = '1';
            }
        });
    }

    // Update progress for playback
    setProgress(progress: number): void {
        this.currentProgress = Math.max(0, Math.min(1, progress));
        
        if (this.progressBar) {
            this.progressBar.style.width = `${this.currentProgress * 100}%`;
        }

        // Highlight played bars
        this.bars.forEach((bar, i) => {
            const barProgress = i / this.options.barCount;
            if (barProgress <= this.currentProgress) {
                bar.style.backgroundColor = '#4a5dc7'; // Darker blue for played
            } else {
                bar.style.backgroundColor = this.options.color;
            }
        });
    }

    private handleSeek(event: MouseEvent): void {
        if (!this.container || !this.options.interactive) return;

        const rect = this.container.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const progress = clickX / rect.width;

        // Dispatch custom event for seek
        this.container.dispatchEvent(new CustomEvent('waveform-seek', {
            detail: { progress: Math.max(0, Math.min(1, progress)) }
        }));
    }

    private resampleData(data: number[], targetLength: number): number[] {
        const result: number[] = [];
        const step = data.length / targetLength;
        
        for (let i = 0; i < targetLength; i++) {
            const index = Math.floor(i * step);
            result.push(data[index] || 0);
        }
        
        return result;
    }

    // Get current waveform data
    getWaveformData(): number[] {
        return [...this.waveformData];
    }

    // Reset waveform
    reset(): void {
        this.waveformData = [];
        this.currentProgress = 0;
        this.bars.forEach(bar => {
            bar.style.height = `${this.options.minHeight}px`;
            bar.style.opacity = '0.3';
            bar.style.backgroundColor = this.options.color;
        });
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
    }

    destroy(): void {
        this.container?.remove();
        this.bars = [];
        this.waveformData = [];
    }
}
