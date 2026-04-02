// pages/api/stores/[id]/connections.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';
import { encrypt } from '../../../../lib/crypto';
import { validateShopify, validateMeta, validateGoogle } from '../../../../lib/validate';

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

        // Validate that credentials have actual non-empty values
        const credValues = Object.values(credentials);
        const hasValidCreds = credValues.some(v => typeof v === 'string' && v.trim().length > 0);
        if (!hasValidCreds) {
            return res.status(400).json({ error: 'Please provide valid credentials. All fields are empty.' });
        }

        const validPlatforms = ['shopify', 'meta', 'google'];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
        }

        // ── Validate credentials by making a real test API call ──
        try {
            switch (platform) {
                case 'shopify':
                    await validateShopify(credentials.domain || store.domain, credentials.apiKey);
                    break;
                case 'meta':
                    await validateMeta(credentials.accessToken, credentials.adAccountId);
                    break;
                case 'google':
                    await validateGoogle(credentials.developerToken, credentials.customerId, credentials.clientId, credentials.clientSecret, credentials.refreshToken, credentials.loginCustomerId);
                    break;
            }
        } catch (validationError) {
            return res.status(400).json({
                error: validationError.message,
                validationFailed: true,
            });
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
