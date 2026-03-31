// pages/api/stores/[id]/reports.js
// Get historical reports for a store

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const agencyId = session.user.agencyId;

    // Verify store ownership
    const store = await prisma.store.findFirst({ where: { id, agencyId } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    if (req.method === 'DELETE') {
        // Full cleanup: delete demos + deduplicate live reports (keep 1 per day)
        // Step 1: Delete demo and legacy demo reports
        await prisma.report.deleteMany({
            where: {
                storeId: id,
                OR: [
                    { isDemo: true },
                    { grossRevenue: 245320, netRevenue: 180120 },
                ],
            },
        });

        // Step 2: Deduplicate live reports — keep only the latest per calendar day
        const allLive = await prisma.report.findMany({
            where: { storeId: id, isDemo: false },
            orderBy: { createdAt: 'desc' },
            select: { id: true, createdAt: true },
        });

        const seenDays = new Set();
        const deleteIds = [];
        for (const r of allLive) {
            const day = new Date(r.createdAt).toISOString().split('T')[0];
            if (seenDays.has(day)) {
                deleteIds.push(r.id);
            } else {
                seenDays.add(day);
            }
        }

        if (deleteIds.length > 0) {
            await prisma.campaign.deleteMany({ where: { reportId: { in: deleteIds } } });
            await prisma.report.deleteMany({ where: { id: { in: deleteIds } } });
        }

        return res.status(200).json({ deleted: deleteIds.length, keptDays: seenDays.size });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // DELETE already handles dedup, so GET just fetches clean data
    const reports = await prisma.report.findMany({
        where: { storeId: id, isDemo: false },
        include: { campaigns: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    return res.status(200).json({ reports });
}
