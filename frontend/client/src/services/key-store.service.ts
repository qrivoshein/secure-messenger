/**
 * Хранилище криптографических ключей в IndexedDB.
 *
 * Хранит:
 *  - identity: собственная пара ECDH-ключей (P-256). Приватный ключ помечен
 *    как non-extractable (его нельзя экспортировать в JWK или сырой массив,
 *    нельзя «утащить» через DevTools или вредоносный скрипт).
 *  - peerSharedKeys: производные общие AES-GCM ключи для пар собеседников,
 *    чтобы не выполнять ECDH на каждое сообщение.
 *  - peerPublicKeys: кэш чужих публичных ключей по username — экономит
 *    обращения к /api/users/:username/public-key.
 *
 * IndexedDB умеет хранить CryptoKey-объекты напрямую через structured clone —
 * это безопаснее JWK в localStorage.
 */
const DB_NAME = "secure-messenger-keys";
const DB_VERSION = 1;
const STORE_IDENTITY = "identity";
const STORE_SHARED = "peerSharedKeys";
const STORE_PEER_PUB = "peerPublicKeys";
const IDENTITY_ID = "me";

export interface IdentityRecord {
    id: string;                   // всегда IDENTITY_ID
    privateKey: CryptoKey;        // ECDH P-256, non-extractable
    publicKey: CryptoKey;         // ECDH P-256, extractable
    publicKeyJwk: JsonWebKey;     // экспортированный JWK (для отправки на сервер)
    createdAt: number;            // ms
}

export interface PeerSharedKeyRecord {
    peerUsername: string;
    sharedKey: CryptoKey;         // AES-GCM 256, derived
    peerPublicKeyJwk: JsonWebKey; // на каком публичном ключе собеседника выведен
    derivedAt: number;
}

export interface PeerPublicKeyRecord {
    username: string;
    publicKeyJwk: JsonWebKey;
    fetchedAt: number;
}

class KeyStore {
    private db: IDBDatabase | null = null;

    private async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_IDENTITY)) {
                    db.createObjectStore(STORE_IDENTITY, { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains(STORE_SHARED)) {
                    db.createObjectStore(STORE_SHARED, { keyPath: "peerUsername" });
                }
                if (!db.objectStoreNames.contains(STORE_PEER_PUB)) {
                    db.createObjectStore(STORE_PEER_PUB, { keyPath: "username" });
                }
            };
            req.onsuccess = () => {
                this.db = req.result;
                resolve(this.db);
            };
            req.onerror = () => reject(req.error);
        });
    }

    private async tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
        const db = await this.open();
        return new Promise<T>((resolve, reject) => {
            const t = db.transaction(store, mode);
            const s = t.objectStore(store);
            const r = fn(s);
            r.onsuccess = () => resolve(r.result as T);
            r.onerror = () => reject(r.error);
        });
    }

    // ----- identity -----

    async getIdentity(): Promise<IdentityRecord | null> {
        return (await this.tx<IdentityRecord | undefined>(STORE_IDENTITY, "readonly", s =>
            s.get(IDENTITY_ID),
        )) ?? null;
    }

    async putIdentity(rec: IdentityRecord): Promise<void> {
        await this.tx<IDBValidKey>(STORE_IDENTITY, "readwrite", s => s.put(rec));
    }

    async clearIdentity(): Promise<void> {
        await this.tx<undefined>(STORE_IDENTITY, "readwrite", s => s.delete(IDENTITY_ID));
        await this.tx<undefined>(STORE_SHARED, "readwrite", s => s.clear());
        await this.tx<undefined>(STORE_PEER_PUB, "readwrite", s => s.clear());
    }

    // ----- shared keys cache -----

    async getSharedKey(peerUsername: string): Promise<PeerSharedKeyRecord | null> {
        return (await this.tx<PeerSharedKeyRecord | undefined>(STORE_SHARED, "readonly", s =>
            s.get(peerUsername),
        )) ?? null;
    }

    async putSharedKey(rec: PeerSharedKeyRecord): Promise<void> {
        await this.tx<IDBValidKey>(STORE_SHARED, "readwrite", s => s.put(rec));
    }

    async dropSharedKey(peerUsername: string): Promise<void> {
        await this.tx<undefined>(STORE_SHARED, "readwrite", s => s.delete(peerUsername));
    }

    // ----- peer public keys cache -----

    async getPeerPublicKey(username: string): Promise<PeerPublicKeyRecord | null> {
        return (await this.tx<PeerPublicKeyRecord | undefined>(STORE_PEER_PUB, "readonly", s =>
            s.get(username),
        )) ?? null;
    }

    async putPeerPublicKey(rec: PeerPublicKeyRecord): Promise<void> {
        await this.tx<IDBValidKey>(STORE_PEER_PUB, "readwrite", s => s.put(rec));
    }
}

export const keyStore = new KeyStore();
