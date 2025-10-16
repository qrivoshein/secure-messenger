// End-to-end encryption service using Web Crypto API

export class EncryptionService {
    private key: CryptoKey | null = null;

    isSecureContext(): boolean {
        return window.isSecureContext && 
               typeof crypto !== 'undefined' && 
               typeof crypto.subtle !== 'undefined';
    }

    async generateKey(): Promise<CryptoKey | null> {
        if (!this.isSecureContext()) {
            console.warn('Encryption not available in insecure context (HTTP). Use HTTPS for encryption.');
            return null;
        }

        try {
            this.key = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            return this.key;
        } catch (error) {
            console.error('Failed to generate encryption key:', error);
            return null;
        }
    }

    async encrypt(message: string, key?: CryptoKey): Promise<{ encrypted: number[]; iv: number[] } | null> {
        const encryptionKey = key || this.key;
        if (!encryptionKey || !this.isSecureContext()) {
            return null;
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                encryptionKey,
                data
            );

            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }

    async decrypt(encryptedData: number[], iv: number[], key?: CryptoKey): Promise<string> {
        const decryptionKey = key || this.key;
        if (!decryptionKey || !this.isSecureContext()) {
            return '[Шифрование недоступно]';
        }

        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                decryptionKey,
                new Uint8Array(encryptedData)
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Ошибка расшифровки]';
        }
    }

    getKey(): CryptoKey | null {
        return this.key;
    }
}

export const encryptionService = new EncryptionService();
