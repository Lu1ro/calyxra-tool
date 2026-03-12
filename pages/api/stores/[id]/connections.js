// pages/api/stores/[id]/connections.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';
import crypto from 'crypto';

// Simple AES-256 encryption for storing API tokens
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET?.padEnd(32, '0').slice(0, 32) || 'calyxra-default-key-change-this!!';
const IV_LENGTH = 16;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query; // store ID
    const agencyId = session.user.agencyId;

    // Verify store belongs to this agency
    const store = await prisma.store.findFirst({
        where: { id, agencyId },
    });

    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }

    if (req.method === 'POST') {
        const { platform, credentials } = req.body;

        if (!platform || !credentials) {
            return res.status(400).json({ error: 'Platform and credentials are required' });
        }

        const validPlatforms = ['shopify', 'meta', 'google', 'tiktok'];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
        }

        // Encrypt the credentials before storing
        const encryptedCreds = encrypt(JSON.stringify(credentials));

        // Upsert — update if exists, create if not
        const existing = await prisma.connection.findFirst({
            where: { storeId: id, platform },
        });

        let connection;
        if (existing) {
            connection = await prisma.connection.update({
                where: { id: existing.id },
                data: { credentials: encryptedCreds, status: 'connected' },
            });
        } else {
            connection = await prisma.connection.create({
                data: {
                    platform,
                    credentials: encryptedCreds,
                    status: 'connected',
                    storeId: id,
                },
            });
        }

        return res.status(200).json({
            connection: { id: connection.id, platform: connection.platform, status: connection.status },
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

export { decrypt };
