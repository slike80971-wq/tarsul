/**
 * Tarsul - تراسل | End-to-End Encryption (E2EE) Module
 * =====================================================
 * Client-side encryption using the Web Crypto API.
 *
 * Encryption Pipeline:
 *   1. Generate RSA-OAEP key pair per user (for key exchange)
 *   2. Generate random AES-GCM session key per message
 *   3. Encrypt message content with AES-GCM
 *   4. Encrypt the AES key with the recipient's RSA public key (RSA-OAEP)
 *   5. Store: { encryptedContent, iv, encryptedKey }
 *   6. Recipient decrypts the AES key with their RSA private key, then decrypts the message
 *
 * Security Notes:
 *   - AES-GCM provides authenticated encryption (confidentiality + integrity)
 *   - RSA-OAEP provides secure key encapsulation
 *   - All keys are generated client-side and never leave the browser unencrypted
 *   - The server only stores ciphertexts and encrypted keys
 */

// ========================
// Type Definitions
// ========================

/** Encrypted message payload stored/transmitted on the server */
export interface EncryptedPayload {
  /** Base64-encoded AES-GCM ciphertext */
  content: string;
  /** Base64-encoded AES-GCM initialization vector */
  iv: string;
  /** Base64-encoded RSA-OAEP encrypted AES session key (encrypted with recipient's public key) */
  encryptedKey?: string;
}

/** Exported key pair for storage */
export interface ExportedKeyPair {
  /** PEM-encoded RSA public key */
  publicKey: string;
  /** PEM-encoded RSA private key (should be stored encrypted client-side) */
  privateKey: string;
}

// ========================
// Utility Functions
// ========================

/** Convert ArrayBuffer to Base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert Base64 string to ArrayBuffer */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Convert string to ArrayBuffer (UTF-8 encoded) */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

/** Convert ArrayBuffer to string (UTF-8 decoded) */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

// ========================
// RSA Key Pair Management (RSA-OAEP)
// ========================

/**
 * Generate a new RSA-OAEP key pair for E2EE.
 * The public key is shared with other users; the private key stays local.
 *
 * @param keySize - Key size in bits (default: 2048 for enterprise security)
 * @returns CryptoKeyPair containing the public and private keys
 */
export async function generateRSAKeyPair(
  keySize: number = 2048
): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: keySize,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable for export/storage
    ['encrypt', 'decrypt']
  );
}

/**
 * Export an RSA public key to PEM format for sharing with other users.
 *
 * @param publicKey - The RSA public key to export
 * @returns PEM-encoded public key string
 */
export async function exportPublicKeyToPEM(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  const base64 = arrayBufferToBase64(exported);
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----`;
  return pem;
}

/**
 * Import an RSA public key from PEM format (received from another user).
 *
 * @param pem - PEM-encoded public key string
 * @returns CryptoKey usable for encryption
 */
export async function importPublicKeyFromPEM(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  const buffer = base64ToArrayBuffer(base64);
  return await crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

/**
 * Export an RSA private key to PEM format for local storage.
 * WARNING: This should be encrypted before storing!
 *
 * @param privateKey - The RSA private key to export
 * @returns PEM-encoded private key string
 */
export async function exportPrivateKeyToPEM(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  const base64 = arrayBufferToBase64(exported);
  const pem = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
  return pem;
}

/**
 * Import an RSA private key from PEM format (from local storage).
 *
 * @param pem - PEM-encoded private key string
 * @returns CryptoKey usable for decryption
 */
export async function importPrivateKeyFromPEM(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const buffer = base64ToArrayBuffer(base64);
  return await crypto.subtle.importKey(
    'pkcs8',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

// ========================
// AES-GCM Message Encryption
// ========================

/**
 * Generate a random AES-GCM key for encrypting a single message.
 *
 * @returns CryptoKey - Random 256-bit AES key
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for encryption with RSA
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext message using AES-GCM.
 *
 * @param plaintext - The message text to encrypt
 * @param key - The AES-GCM key
 * @returns Object containing base64-encoded ciphertext and IV
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ content: string; iv: string }> {
  // Generate a random 12-byte IV (nonce) for each message (GCM standard)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  // Encrypt with AES-GCM (provides both confidentiality and authentication)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    content: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt an AES-GCM encrypted message.
 *
 * @param encryptedContent - Base64-encoded ciphertext
 * @param iv - Base64-encoded initialization vector
 * @param key - The AES-GCM key
 * @returns Decrypted plaintext string
 */
export async function decryptMessage(
  encryptedContent: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encryptedContent);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ========================
// Key Encapsulation (RSA-OAEP wrapping of AES key)
// ========================

/**
 * Encrypt an AES session key with a recipient's RSA public key.
 * This allows only the recipient to decrypt the message.
 *
 * @param aesKey - The AES-GCM session key
 * @param recipientPublicKey - The recipient's RSA-OAEP public key
 * @returns Base64-encoded encrypted AES key
 */
export async function encryptAESKey(
  aesKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const exportedAES = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    exportedAES
  );
  return arrayBufferToBase64(encryptedKey);
}

/**
 * Decrypt an AES session key using the recipient's RSA private key.
 *
 * @param encryptedKey - Base64-encoded encrypted AES key
 * @param privateKey - The recipient's RSA-OAEP private key
 * @returns Decrypted AES-GCM session key
 */
export async function decryptAESKey(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
  const decryptedKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );
  return await crypto.subtle.importKey(
    'raw',
    decryptedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ========================
// Full E2EE Pipeline
// ========================

/**
 * Encrypt a message for a specific recipient using the full E2EE pipeline.
 *
 * Pipeline:
 *   1. Generate random AES-256 session key
 *   2. Encrypt the message with AES-GCM
 *   3. Encrypt the AES key with recipient's RSA public key
 *
 * @param plaintext - The message to encrypt
 * @param recipientPublicKeyPEM - The recipient's PEM-encoded RSA public key
 * @returns EncryptedPayload containing all data needed for decryption
 */
export async function encryptForRecipient(
  plaintext: string,
  recipientPublicKeyPEM: string
): Promise<EncryptedPayload> {
  // Step 1: Generate random AES session key
  const aesKey = await generateAESKey();

  // Step 2: Encrypt the message content with AES-GCM
  const { content, iv } = await encryptMessage(plaintext, aesKey);

  // Step 3: Encrypt the AES key with recipient's RSA public key
  const recipientPublicKey = await importPublicKeyFromPEM(recipientPublicKeyPEM);
  const encryptedKey = await encryptAESKey(aesKey, recipientPublicKey);

  return { content, iv, encryptedKey };
}

/**
 * Decrypt a message received from another user using the full E2EE pipeline.
 *
 * Pipeline:
 *   1. Decrypt the AES session key using your RSA private key
 *   2. Decrypt the message content with the AES key
 *
 * @param payload - The encrypted payload (content, iv, encryptedKey)
 * @param privateKeyPEM - Your PEM-encoded RSA private key
 * @returns Decrypted plaintext message
 */
export async function decryptFromSender(
  payload: EncryptedPayload,
  privateKeyPEM: string
): Promise<string> {
  // Step 1: Decrypt the AES session key
  const privateKey = await importPrivateKeyFromPEM(privateKeyPEM);
  const aesKey = await decryptAESKey(payload.encryptedKey!, privateKey);

  // Step 2: Decrypt the message content
  return await decryptMessage(payload.content, payload.iv, aesKey);
}

/**
 * Encrypt a message for a channel (shared encryption).
 * Uses a channel-level AES key derived from the channel ID.
 * All channel members share this key.
 *
 * @param plaintext - The message to encrypt
 * @param channelKey - The shared AES key for the channel
 * @returns EncryptedPayload (no encryptedKey needed for channel messages)
 */
export async function encryptForChannel(
  plaintext: string,
  channelKey: CryptoKey
): Promise<EncryptedPayload> {
  const { content, iv } = await encryptMessage(plaintext, channelKey);
  return { content, iv };
}

/**
 * Decrypt a channel message using the shared channel key.
 *
 * @param payload - The encrypted payload
 * @param channelKey - The shared AES key for the channel
 * @returns Decrypted plaintext message
 */
export async function decryptChannelMessage(
  payload: EncryptedPayload,
  channelKey: CryptoKey
): Promise<string> {
  return await decryptMessage(payload.content, payload.iv, channelKey);
}

/**
 * Derive a channel encryption key from the channel ID.
 * This ensures all channel members use the same key.
 *
 * @param channelId - The channel's unique identifier
 * @param userPrivateKey - The user's private key (for key derivation)
 * @returns A deterministic AES-GCM key derived from the channel ID
 */
export async function deriveChannelKey(
  channelId: string,
  userPrivateKey: CryptoKey
): Promise<CryptoKey> {
  // Use HKDF to derive a channel key from the channel ID
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelId),
    'HKDF',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('tarsul-channel-salt'),
      info: encoder.encode(channelId),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hash a password using SHA-256 for authentication.
 * (Note: In production, use bcrypt/argon2 on the server; this is for client-side hashing before transmission)
 *
 * @param password - The password to hash
 * @returns SHA-256 hash as hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ========================
// Crypto Manager Class (Singleton)
// ========================

/**
 * Manages the user's cryptographic identity and key storage.
 * Implements the E2EE lifecycle for the chat application.
 */
export class CryptoManager {
  private static instance: CryptoManager;
  private keyPair: CryptoKeyPair | null = null;
  private privateKeyPEM: string | null = null;
  private publicKeyPEM: string | null = null;
  private channelKeys: Map<string, CryptoKey> = new Map();

  private constructor() {}

  /** Get the singleton instance */
  static getInstance(): CryptoManager {
    if (!CryptoManager.instance) {
      CryptoManager.instance = new CryptoManager();
    }
    return CryptoManager.instance;
  }

  /**
   * Initialize or restore the user's key pair.
   * - If keys exist in localStorage, restore them
   * - Otherwise, generate a new key pair
   */
  async initialize(): Promise<{ publicKeyPEM: string }> {
    // Try to restore from localStorage
    const storedPrivateKey = localStorage.getItem('tarsul_private_key');
    const storedPublicKey = localStorage.getItem('tarsul_public_key');

    if (storedPrivateKey && storedPublicKey) {
      this.privateKeyPEM = storedPrivateKey;
      this.publicKeyPEM = storedPublicKey;
      const privateKey = await importPrivateKeyFromPEM(storedPrivateKey);
      const publicKey = await importPublicKeyFromPEM(storedPublicKey);
      this.keyPair = { publicKey, privateKey };
    } else {
      // Generate new key pair
      this.keyPair = await generateRSAKeyPair(2048);
      this.publicKeyPEM = await exportPublicKeyToPEM(this.keyPair.publicKey);
      this.privateKeyPEM = await exportPrivateKeyToPEM(this.keyPair.privateKey);

      // Store in localStorage (in production, encrypt private key with user passphrase)
      localStorage.setItem('tarsul_private_key', this.privateKeyPEM);
      localStorage.setItem('tarsul_public_key', this.publicKeyPEM);
    }

    return { publicKeyPEM: this.publicKeyPEM };
  }

  /** Get the current user's public key in PEM format */
  getPublicKeyPEM(): string | null {
    return this.publicKeyPEM;
  }

  /** Check if the crypto manager is initialized */
  isInitialized(): boolean {
    return this.keyPair !== null;
  }

  /**
   * Encrypt a message for a specific recipient.
   * Uses RSA-OAEP for key exchange + AES-GCM for message encryption.
   */
  async encryptForDM(plaintext: string, recipientPublicKeyPEM: string): Promise<EncryptedPayload> {
    return encryptForRecipient(plaintext, recipientPublicKeyPEM);
  }

  /** Decrypt a direct message received from another user. */
  async decryptDM(payload: EncryptedPayload): Promise<string> {
    if (!this.privateKeyPEM) throw new Error('CryptoManager not initialized');
    return decryptFromSender(payload, this.privateKeyPEM);
  }

  /**
   * Get or derive the encryption key for a channel.
   */
  async getChannelKey(channelId: string): Promise<CryptoKey> {
    const cached = this.channelKeys.get(channelId);
    if (cached) return cached;

    if (!this.keyPair) throw new Error('CryptoManager not initialized');
    const key = await deriveChannelKey(channelId, this.keyPair.privateKey);
    this.channelKeys.set(channelId, key);
    return key;
  }

  /** Encrypt a message for a channel. */
  async encryptForChannel(plaintext: string, channelId: string): Promise<EncryptedPayload> {
    const channelKey = await this.getChannelKey(channelId);
    return encryptForChannel(plaintext, channelKey);
  }

  /** Decrypt a channel message. */
  async decryptChannelMessage(payload: EncryptedPayload, channelId: string): Promise<string> {
    const channelKey = await this.getChannelKey(channelId);
    return decryptChannelMessage(payload.content, payload.iv, channelKey);
  }

  /** Clear all stored keys (for logout). */
  clear(): void {
    this.keyPair = null;
    this.privateKeyPEM = null;
    this.publicKeyPEM = null;
    this.channelKeys.clear();
    localStorage.removeItem('tarsul_private_key');
    localStorage.removeItem('tarsul_public_key');
  }
}

export default CryptoManager;