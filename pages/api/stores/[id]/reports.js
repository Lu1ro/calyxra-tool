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
        // Clean up demo reports from the database:
        // 1. Reports explicitly marked as demo
        // 2. Legacy reports that used hardcoded sample data (before the fix)
        //    — identifiable by the exact demo values: grossRevenue=245320, netRevenue=180120
        const deleted = await prisma.report.deleteMany({
            where: {
                storeId: id,
                OR: [
                    { isDemo: true },
                    { grossRevenue: 245320, netRevenue: 180120 },
                ],
            },
        });
        return res.status(200).json({ deleted: deleted.count });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const reports = await prisma.report.findMany({
        where: { storeId: id, isDemo: false },
        include: { campaigns: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    // Deduplicate: keep only one report per calendar day (latest per day)
    const seenDays = new Set();
    const deduplicated = reports.filter(r => {
        const day = new Date(r.createdAt).toISOString().split('T')[0];
        if (seenDays.has(day)) return false;
        seenDays.add(day);
        return true;
    });

    // Delete excess duplicates from DB (keep only the deduped ones)
    if (reports.length > deduplicated.length) {
        const keepIds = new Set(deduplicated.map(r => r.id));
        const deleteIds = reports.filter(r => !keepIds.has(r.id)).map(r => r.id);
        if (deleteIds.length > 0) {
            await prisma.campaign.deleteMany({ where: { reportId: { in: deleteIds } } });
            await prisma.report.deleteMany({ where: { id: { in: deleteIds } } });
        }
    }

    // Return max 10 most recent unique days for the chart
    return res.status(200).json({ reports: deduplicated.slice(0, 10) });
}
