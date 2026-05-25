/**
 * Тонкая обёртка над encryptionService для прозрачного шифрования / расшифровки
 * текстов сообщений на уровне MessengerApp.
 *
 * Формат шифрованного payload в поле text:
 *   "ENC:" + JSON.stringify({e: number[], i: number[], f: string})
 *      e — шифротекст + AEAD-тег как массив байт
 *      i — IV (12 байт)
 *      f — fingerprint используемого peer public key (для desync detection)
 *
 * При получении: если text начинается с "ENC:" — пытаемся расшифровать.
 * Иначе считаем сообщение legacy plaintext (старые сообщения, отправленные
 * до раскатки E2E, остаются читаемыми).
 */
import { encryptionService } from "./encryption.service";

const PREFIX = "ENC:";

export interface CipherEnvelope {
    e: number[];
    i: number[];
    f: string;
}

class MessageCipher {
    /**
     * Готовит text сообщения к отправке: шифрует под собеседника либо отдаёт
     * как есть, если безопасный контекст недоступен или у собеседника ещё нет
     * публичного ключа на сервере.
     */
    async prepareForSend(text: string, peerUsername: string): Promise<string> {
        if (!text || !encryptionService.isSecureContext()) return text;
        const payload = await encryptionService.encryptForPeer(text, peerUsername);
        if (!payload) {
            // У собеседника пока нет публичного ключа — отдаём plaintext с warning.
            // Это легитимный сценарий первого знакомства, когда мы первыми пишем
            // в чат человеку, который ещё не успел запустить клиент.
            console.warn(
                `[E2E] No shared key for ${peerUsername} — sending plaintext (peer key not yet published)`,
            );
            return text;
        }
        const env: CipherEnvelope = {
            e: payload.encrypted,
            i: payload.iv,
            f: payload.keyFingerprint,
        };
        return PREFIX + JSON.stringify(env);
    }

    /**
     * Расшифровывает text входящего сообщения. Возвращает читаемый текст либо
     * placeholder при ошибке.
     */
    async decryptIncoming(text: string | null | undefined, peerUsername: string): Promise<string> {
        if (!text) return text ?? "";
        if (!text.startsWith(PREFIX)) return text; // legacy plaintext
        try {
            const env = JSON.parse(text.slice(PREFIX.length)) as CipherEnvelope;
            const decrypted = await encryptionService.decryptFromPeer(
                { encrypted: env.e, iv: env.i, keyFingerprint: env.f },
                peerUsername,
            );
            if (decrypted === null) return "[зашифровано — ключ недоступен]";
            return decrypted;
        } catch (err) {
            console.error("[E2E] Failed to parse/decrypt incoming message:", err);
            return "[не удалось расшифровать]";
        }
    }

    /** Помечен ли text как зашифрованный envelope. */
    isEncrypted(text: string | null | undefined): boolean {
        return typeof text === "string" && text.startsWith(PREFIX);
    }
}

export const messageCipher = new MessageCipher();
