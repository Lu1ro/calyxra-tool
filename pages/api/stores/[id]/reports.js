// pages/api/stores/[id]/reports.js
// Get historical reports for a store

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const agencyId = session.user.agencyId;

    // Verify store ownership
    const store = await prisma.store.findFirst({ where: { id, agencyId } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const reports = await prisma.report.findMany({
        where: { storeId: id },
        include: { campaigns: true },
        orderBy: { createdAt: 'desc' },
        take: 30, // Last 30 reports
    });

    return res.status(200).json({ reports });
}
