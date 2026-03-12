// pages/api/stores/[id]/actions.js
// Execute campaign actions (pause, reduce, scale) based on optimizer recommendations

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';
import { decrypt } from '../../../../lib/crypto';
import { executeActions } from '../../../../lib/actions';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const { actions, isDemo = true } = req.body;

    if (!actions || !actions.length) {
        return res.status(400).json({ error: 'No actions provided' });
    }

    const store = await prisma.store.findFirst({
        where: { id, agencyId: session.user.agencyId },
        include: { connections: true },
    });

    if (!store) return res.status(404).json({ error: 'Store not found' });

    // Get credentials for executing actions
    const credentials = {};
    for (const conn of store.connections) {
        try {
            const creds = JSON.parse(decrypt(conn.credentials));
            credentials[conn.platform] = creds;
        } catch (e) { }
    }

    try {
        const results = await executeActions(actions, credentials, isDemo);

        return res.json({
            success: true,
            results,
            summary: {
                executed: results.filter(r => r.status === 'executed').length,
                simulated: results.filter(r => r.status === 'simulated').length,
                failed: results.filter(r => r.status === 'failed').length,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
