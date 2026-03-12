import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query; // store ID

    // Ensure the agency owns this store
    const store = await prisma.store.findUnique({
        where: { id },
        select: { agencyId: true }
    });

    if (!store || store.agencyId !== session.user.agencyId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'PUT') {
        try {
            const { databaseConfig, analyticsConfig } = req.body;

            const updateData = {};

            if (databaseConfig !== undefined) {
                try {
                    const parsedDb = JSON.parse(databaseConfig);
                    if (!parsedDb.type || !parsedDb.credentials || typeof parsedDb.credentials !== 'object') {
                        return res.status(400).json({ error: 'Invalid databaseConfig format' });
                    }
                    updateData.databaseConfig = databaseConfig;
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON for databaseConfig' });
                }
            }

            if (analyticsConfig !== undefined) {
                try {
                    const parsedAnalytics = JSON.parse(analyticsConfig);
                    if (!Array.isArray(parsedAnalytics)) {
                        return res.status(400).json({ error: 'Invalid analyticsConfig format, must be an array' });
                    }
                    updateData.analyticsConfig = analyticsConfig;
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON for analyticsConfig' });
                }
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: 'No valid fields provided for update' });
            }

            const updatedStore = await prisma.store.update({
                where: { id },
                data: updateData,
            });

            return res.status(200).json({ success: true, store: updatedStore });
        } catch (error) {
            console.error('Failed to update store settings:', error);
            return res.status(500).json({ error: 'Failed to update store settings' });
        }
    } else if (req.method === 'GET') {
        try {
            const currentStore = await prisma.store.findUnique({
                where: { id },
                select: { databaseConfig: true, analyticsConfig: true }
            });
            return res.status(200).json({ store: currentStore });
        } catch (error) {
            console.error('Failed to get store settings:', error);
            return res.status(500).json({ error: 'Failed to get store settings' });
        }
    }

    res.setHeader('Allow', ['PUT', 'GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
