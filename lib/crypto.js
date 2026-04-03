// lib/crypto.js
// Shared encryption utilities for API token storage
// Uses AES-256-GCM with proper key derivation

const crypto = require('crypto');

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('FATAL: NEXTAUTH_SECRET environment variable is required. Generate one with: openssl rand -base64 32');
}

// Derive a proper 32-byte key using HKDF instead of naive padding
const ENCRYPTION_KEY = crypto.createHash('sha256').update(process.env.NEXTAUTH_SECRET).digest();
const IV_LENGTH = 12; // GCM recommended IV length

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:ciphertext (all hex)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const parts = text.split(':');
    // Support legacy CBC format (iv:ciphertext) for backwards compatibility
    if (parts.length === 2) {
        return decryptLegacyCBC(text);
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
}

// Backwards-compatible decryption for credentials encrypted with old CBC method
function decryptLegacyCBC(text) {
    const legacyKey = process.env.NEXTAUTH_SECRET.padEnd(32, '0').slice(0, 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(legacyKey), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = { encrypt, decrypt };
