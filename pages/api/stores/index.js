// pages/api/stores/index.js
// Store CRUD — list and create stores for the authenticated agency
import { prisma } from '../../../lib/db';
import { withAuth, withRateLimit, withErrorHandler, withMethods, sanitize, validateInput } from '../../../lib/middleware';

async function handler(req, res) {
    const agencyId = req.session.user.agencyId;

    if (req.method === 'GET') {
        const stores = await prisma.store.findMany({
            where: { agencyId },
            include: {
                connections: {
                    select: { id: true, platform: true, status: true, lastSyncAt: true },
                },
                reports: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { phantomPct: true, trueRoas: true, createdAt: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ stores });
    }

    if (req.method === 'POST') {
        // Validate input
        const { valid, errors } = validateInput(req.body, {
            name: { type: 'string', required: true, maxLength: 100, minLength: 1 },
            domain: { type: 'string', required: true, maxLength: 200, minLength: 3 },
        });

        if (!valid) {
            return res.status(400).json({ error: errors.join(', ') });
        }

        const name = sanitize(req.body.name);
        const domain = sanitize(req.body.domain).replace('https://', '').replace('http://', '');

        // Check tier limits
        const tierLimits = { free: 1, paid: 3, agency: 50 };
        const agency = await prisma.agency.findUnique({ where: { id: agencyId } });

        // Free tier: enforce lifetime store limit
        if (agency.tier === 'free' && agency.totalStoresEver >= 1) {
            return res.status(403).json({
                error: 'upgrade_required',
                message: 'Upgrade to add more stores',
            });
        }

        const storeCount = await prisma.store.count({ where: { agencyId } });
        const maxStores = tierLimits[agency.tier] || 1;

        if (storeCount >= maxStores) {
            return res.status(403).json({ error: `Your ${agency.tier} plan allows up to ${maxStores} stores. Upgrade to add more.` });
        }

        const store = await prisma.store.create({
            data: { name, domain, agencyId },
        });

        // Increment lifetime store counter
        await prisma.agency.update({
            where: { id: agencyId },
            data: { totalStoresEver: { increment: 1 } },
        });

        return res.status(201).json({ store });
    }

    if (req.method === 'DELETE') {
        const { storeId } = req.body || {};

        if (!storeId) {
            return res.status(400).json({ error: 'storeId is required' });
        }

        // Verify store belongs to this agency
        const store = await prisma.store.findFirst({
            where: { id: storeId, agencyId },
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Delete store — Prisma cascade deletes connections, reports, campaigns, alerts
        await prisma.store.delete({
            where: { id: storeId },
        });

        return res.status(200).json({ success: true, deletedStoreId: storeId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Compose middleware: auth check → rate limit (30/min) → error handler → method filter
export default withErrorHandler(withRateLimit(withAuth(withMethods(handler, ['GET', 'POST', 'DELETE'])), 30));
