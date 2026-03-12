// pages/api/alerts/index.js
// Get alerts for the agency, optionally filtered by store

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/db';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const agencyId = session.user.agencyId;

    if (req.method === 'GET') {
        const { storeId, resolved, limit = 50 } = req.query;

        // Build query — get alerts for stores belonging to this agency
        const where = {
            store: { agencyId },
        };

        if (storeId) where.storeId = storeId;
        if (resolved === 'true') where.resolved = true;
        else if (resolved === 'false') where.resolved = false;

        const alerts = await prisma.alert.findMany({
            where,
            include: {
                store: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
        });

        const unresolvedCount = await prisma.alert.count({
            where: { store: { agencyId }, resolved: false },
        });

        return res.status(200).json({ alerts, unresolvedCount });
    }

    if (req.method === 'PATCH') {
        // Resolve/unresolve an alert
        const { alertId, resolved } = req.body;

        if (!alertId) return res.status(400).json({ error: 'alertId required' });

        // Verify ownership
        const alert = await prisma.alert.findFirst({
            where: { id: alertId, store: { agencyId } },
        });

        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        const updated = await prisma.alert.update({
            where: { id: alertId },
            data: {
                resolved: resolved ?? true,
                resolvedAt: resolved ? new Date() : null,
            },
        });

        return res.status(200).json({ alert: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
