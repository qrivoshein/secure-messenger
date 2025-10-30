// Audio and voice recording service

export class AudioService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private analyser: AnalyserNode | null = null;
    private audioContext: AudioContext | null = null;
    private currentMimeType: string = 'audio/webm';

    async startRecording(): Promise<void> {
        try {
            // Check MediaRecorder support
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('MediaRecorder не поддерживается этим браузером');
            }

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup audio context for visualization
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            // Determine supported MIME type
            const mimeType = this.getSupportedMimeType();
            console.log('Selected MIME type for recording:', mimeType);

            // Setup media recorder with fallback
            let options: MediaRecorderOptions = {};
            
            if (mimeType) {
                options.mimeType = mimeType;
                this.currentMimeType = mimeType;
            } else {
                // Safari fallback - let it use default
                console.log('Using browser default MIME type');
                this.currentMimeType = 'audio/mp4'; // Safari default
            }
            
            this.mediaRecorder = new MediaRecorder(this.stream, options);

            // Log actual MIME type being used
            console.log('MediaRecorder MIME type:', this.mediaRecorder.mimeType);
            this.currentMimeType = this.mediaRecorder.mimeType || this.currentMimeType;

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes, type:', event.data.type);
                }
            };

            this.mediaRecorder.start();
            console.log('Recording started successfully');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Не удалось получить доступ к микрофону');
        }
    }

    private getSupportedMimeType(): string {
        // Prioritize webm/opus for better browser compatibility
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        console.log('Browser:', isSafari ? 'Safari' : 'Other');
        console.log('MediaRecorder supported:', typeof MediaRecorder !== 'undefined');
        
        // Test which formats the browser can actually PLAY (not just record)
        const audioElement = new Audio();
        console.log('Browser playback support:');
        console.log('  audio/webm: ', audioElement.canPlayType('audio/webm'));
        console.log('  audio/webm;codecs=opus: ', audioElement.canPlayType('audio/webm;codecs=opus'));
        console.log('  audio/mp4: ', audioElement.canPlayType('audio/mp4'));
        console.log('  audio/mp4;codecs=mp4a.40.2: ', audioElement.canPlayType('audio/mp4;codecs=mp4a.40.2'));
        console.log('  audio/ogg: ', audioElement.canPlayType('audio/ogg'));
        console.log('  audio/wav: ', audioElement.canPlayType('audio/wav'));
        
        // Prioritize formats that can be both recorded AND played
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4;codecs=mp4a.40.2', // More specific codec for Safari
            'audio/mp4',
            'audio/wav'
        ];

        for (const type of types) {
            const canRecord = MediaRecorder.isTypeSupported(type);
            const canPlay = audioElement.canPlayType(type);
            console.log(`Testing ${type}: record=${canRecord}, play=${canPlay}`);
            
            // Only use if both recording AND playback are supported
            if (canRecord && canPlay !== '') {
                console.log('✓ Selected MIME type:', type);
                return type;
            }
        }

        console.warn('No supported MIME type found with playback support');
        // Last resort: try without playback check
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.warn('⚠ Using type without playback verification:', type);
                return type;
            }
        }
        
        // Return empty to let browser choose default
        return '';
    }

    stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('Recording not started'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped, chunks:', this.audioChunks.length);
                console.log('Creating blob with type:', this.currentMimeType);
                
                // Log chunk types for debugging
                this.audioChunks.forEach((chunk, i) => {
                    console.log(`Chunk ${i}: type=${chunk.type}, size=${chunk.size}`);
                });
                
                // Use the actual type from chunks if available
                let blobType = this.currentMimeType;
                if (this.audioChunks.length > 0 && this.audioChunks[0].type) {
                    blobType = this.audioChunks[0].type;
                    console.log('Using chunk type instead:', blobType);
                }
                
                const blob = new Blob(this.audioChunks, { type: blobType });
                console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
                
                // Test if blob can be played
                const testUrl = URL.createObjectURL(blob);
                console.log('Test blob URL:', testUrl);
                const testAudio = new Audio(testUrl);
                
                // Check if browser can play this format
                const canPlayBlob = testAudio.canPlayType(blob.type);
                console.log(`Browser canPlayType('${blob.type}'): ${canPlayBlob}`);
                
                testAudio.addEventListener('canplaythrough', () => {
                    console.log('✓ Blob can be played');
                    URL.revokeObjectURL(testUrl);
                });
                testAudio.addEventListener('error', (e) => {
                    console.error('✗ Blob cannot be played:', e, testAudio.error);
                    console.error('Error code:', testAudio.error?.code);
                    console.error('Error message:', testAudio.error?.message);
                    URL.revokeObjectURL(testUrl);
                });
                testAudio.addEventListener('loadstart', () => {
                    console.log('Blob load started');
                });
                testAudio.addEventListener('loadedmetadata', () => {
                    console.log('✓ Blob metadata loaded, duration:', testAudio.duration);
                });
                testAudio.load();
                
                this.cleanup();
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.cleanup();
    }

    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    getCurrentMimeType(): string {
        return this.currentMimeType;
    }

    getFileExtension(): string {
        // Extract extension from MIME type
        const mimeToExt: Record<string, string> = {
            'audio/webm': 'webm',
            'audio/webm;codecs=opus': 'webm',
            'audio/ogg': 'ogg',
            'audio/ogg;codecs=opus': 'ogg',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav'
        };
        
        // If no mime type was set, default based on browser
        if (!this.currentMimeType) {
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            return isSafari ? 'm4a' : 'webm';
        }
        
        return mimeToExt[this.currentMimeType] || 'webm';
    }

    playNotificationSound(): void {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.error('Failed to play notification sound:', error);
        }
    }
}

export const audioService = new AudioService();
