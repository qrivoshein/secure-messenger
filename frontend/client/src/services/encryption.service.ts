/**
 * Сквозное шифрование сообщений (E2E) через ECDH P-256 + AES-GCM-256.
 *
 * Идея:
 *  1. При первом запуске клиента генерируется пара ECDH-ключей (P-256).
 *     Приватный ключ — non-extractable, лежит в IndexedDB и не выходит за
 *     пределы устройства. Публичный — отправляется на сервер.
 *  2. При первом обмене с собеседником клиент получает с сервера его
 *     публичный ключ и через crypto.subtle.deriveKey() вычисляет общий
 *     симметричный AES-GCM-256 ключ. Общий ключ кэшируется в IndexedDB.
 *  3. Каждое сообщение шифруется AES-GCM с уникальным 12-байтным IV.
 *     Сервер видит только шифротекст + IV, общим ключом не располагает —
 *     задача дискретного логарифмирования на эллиптической кривой не даёт
 *     ему восстановить shared secret из двух публичных ключей.
 *  4. Ротация долговременных ECDH-ключей — раз в 90 дней (rotateIfStale()).
 */

import { httpClient } from "../api/http.client";
import {
    keyStore,
    type IdentityRecord,
    type PeerSharedKeyRecord,
} from "./key-store.service";

const KEY_TTL_DAYS = 90;
const KEY_TTL_MS = KEY_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface EncryptedPayload {
    encrypted: number[]; // байты шифротекста + AEAD-тег
    iv: number[];        // 12 байт
    keyFingerprint: string; // первые 8 hex-символов SHA-256 от используемого peer public JWK
}

export class EncryptionService {
    private identityCache: IdentityRecord | null = null;

    isSecureContext(): boolean {
        return (
            window.isSecureContext &&
            typeof crypto !== "undefined" &&
            typeof crypto.subtle !== "undefined"
        );
    }

    // ----- identity -----

    /**
     * Возвращает existing identity или создаёт новую и отправляет публичный
     * ключ на сервер.  Идемпотентно: вызвать можно сколько угодно раз.
     */
    async ensureIdentity(uploadToServer = true): Promise<IdentityRecord | null> {
        if (!this.isSecureContext()) {
            console.warn(
                "E2E disabled: insecure context (HTTP). Use HTTPS for encryption.",
            );
            return null;
        }

        if (this.identityCache) return this.identityCache;

        const existing = await keyStore.getIdentity();
        if (existing) {
            this.identityCache = existing;
            if (Date.now() - existing.createdAt > KEY_TTL_MS) {
                // Ключу больше 90 дней — мягкая ротация в фоне
                console.log("[E2E] Identity key is older than 90 days, rotating...");
                return this.rotateIdentity();
            }
            return existing;
        }

        return this.generateNewIdentity(uploadToServer);
    }

    /**
     * Принудительная ротация собственного долговременного ключа.
     * Уничтожает все ранее производные shared-ключи и публикует новый
     * публичный на сервере.
     */
    async rotateIdentity(): Promise<IdentityRecord | null> {
        await keyStore.clearIdentity();
        this.identityCache = null;
        return this.generateNewIdentity(true);
    }

    private async generateNewIdentity(uploadToServer: boolean): Promise<IdentityRecord> {
        const keyPair = (await crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            false, // приватный — non-extractable, защита от извлечения
            ["deriveKey"],
        )) as CryptoKeyPair;

        // Публичный экспортируем — он публичный по определению
        const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

        const rec: IdentityRecord = {
            id: "me",
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            publicKeyJwk: publicJwk,
            createdAt: Date.now(),
        };

        await keyStore.putIdentity(rec);
        this.identityCache = rec;

        if (uploadToServer) {
            try {
                await httpClient.uploadPublicKey(JSON.stringify(publicJwk));
            } catch (err) {
                console.warn("[E2E] Failed to upload public key, will retry later:", err);
            }
        }

        console.log("[E2E] Generated new ECDH identity, public JWK uploaded.");
        return rec;
    }

    /** Экспорт собственного публичного ключа (JWK-строка) для регистрации/обновления. */
    async getOwnPublicKeyJwk(): Promise<string | null> {
        const id = await this.ensureIdentity(false);
        return id ? JSON.stringify(id.publicKeyJwk) : null;
    }

    // ----- shared keys -----

    /**
     * Вычисляет (или достаёт из кэша) общий AES-GCM-256 ключ для пары
     * текущий_пользователь <-> peerUsername.
     */
    async getSharedKey(peerUsername: string): Promise<CryptoKey | null> {
        const id = await this.ensureIdentity();
        if (!id) return null;

        // 1. Кэш
        const cached = await keyStore.getSharedKey(peerUsername);

        // 2. Свежий публичный ключ собеседника
        const peerJwk = await this.fetchPeerPublicKey(peerUsername);
        if (!peerJwk) return null;

        // Если у нас есть кэш и публичный ключ собеседника не изменился — используем кэш
        if (cached && this.jwkEquals(cached.peerPublicKeyJwk, peerJwk)) {
            return cached.sharedKey;
        }

        // 3. Импортируем публичный ключ собеседника как ECDH P-256
        const peerKey = await crypto.subtle.importKey(
            "jwk",
            peerJwk,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            [],
        );

        // 4. ECDH-deriveKey → AES-GCM-256
        const sharedKey = await crypto.subtle.deriveKey(
            { name: "ECDH", public: peerKey },
            id.privateKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );

        const rec: PeerSharedKeyRecord = {
            peerUsername,
            sharedKey,
            peerPublicKeyJwk: peerJwk,
            derivedAt: Date.now(),
        };
        await keyStore.putSharedKey(rec);
        return sharedKey;
    }

    private async fetchPeerPublicKey(username: string): Promise<JsonWebKey | null> {
        try {
            const cached = await keyStore.getPeerPublicKey(username);
            // Кэш живёт сутки; за этим интервалом ключ может быть ротирован
            const FRESH_TTL = 24 * 60 * 60 * 1000;
            if (cached && Date.now() - cached.fetchedAt < FRESH_TTL) {
                return cached.publicKeyJwk;
            }
            const { publicKey } = await httpClient.fetchPeerPublicKey(username);
            const jwk = JSON.parse(publicKey) as JsonWebKey;
            await keyStore.putPeerPublicKey({
                username,
                publicKeyJwk: jwk,
                fetchedAt: Date.now(),
            });
            return jwk;
        } catch (err) {
            console.warn(`[E2E] Failed to fetch public key for ${username}:`, err);
            return null;
        }
    }

    private jwkEquals(a: JsonWebKey, b: JsonWebKey): boolean {
        // Сравниваем только координаты публичной точки на кривой; остальное служебное
        return a.x === b.x && a.y === b.y && a.crv === b.crv;
    }

    // ----- шифрование сообщения -----

    async encryptForPeer(
        message: string,
        peerUsername: string,
    ): Promise<EncryptedPayload | null> {
        const key = await this.getSharedKey(peerUsername);
        if (!key) return null;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = new TextEncoder().encode(message);
            const encrypted = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                key,
                data,
            );
            const fp = await this.peerKeyFingerprint(peerUsername);
            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                keyFingerprint: fp,
            };
        } catch (err) {
            console.error("[E2E] Encrypt failed:", err);
            return null;
        }
    }

    async decryptFromPeer(
        payload: EncryptedPayload,
        peerUsername: string,
    ): Promise<string | null> {
        const key = await this.getSharedKey(peerUsername);
        if (!key) return null;
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
                key,
                new Uint8Array(payload.encrypted),
            );
            return new TextDecoder().decode(decrypted);
        } catch (err) {
            console.error("[E2E] Decrypt failed:", err);
            return null;
        }
    }

    /**
     * Короткий «отпечаток» используемого общего ключа: первые 8 hex-символов
     * SHA-256 от JWK собеседника. Помогает обнаружить рассинхронизацию
     * (если у получателя ключ собеседника обновился).
     */
    private async peerKeyFingerprint(peerUsername: string): Promise<string> {
        const peer = await keyStore.getPeerPublicKey(peerUsername);
        if (!peer) return "";
        const data = new TextEncoder().encode(JSON.stringify(peer.publicKeyJwk));
        const hash = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hash).slice(0, 4))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    }

    // ----- утилиты -----

    async clearAllKeys(): Promise<void> {
        await keyStore.clearIdentity();
        this.identityCache = null;
    }
}

export const encryptionService = new EncryptionService();
