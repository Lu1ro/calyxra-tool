// pages/api/agencies/disable.js | Deactivate agency account (called by Stripe webhook)

import { prisma } from '../../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify internal API secret
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { stripeCustomerId, email } = req.body || {};

    if (!stripeCustomerId && !email) {
        return res.status(400).json({ error: 'stripeCustomerId or email is required' });
    }

    try {
        // Find agency by email (since schema doesn't have stripeCustomerId field)
        // The webhook should pass the email from the Stripe customer object
        if (email) {
            const agency = await prisma.agency.findUnique({
                where: { email },
            });

            if (!agency) {
                return res.status(404).json({ error: 'Agency not found' });
            }

            // Set tier to 'disabled' to prevent login
            await prisma.agency.update({
                where: { id: agency.id },
                data: { tier: 'disabled' },
            });

            console.log(`[DISABLE] Agency ${agency.email} disabled (subscription cancelled)`);
            return res.status(200).json({ success: true, agencyId: agency.id });
        }

        // If only stripeCustomerId provided, log a warning
        // (Schema doesn't have this field — would need migration to add it)
        console.warn(`[DISABLE] stripeCustomerId ${stripeCustomerId} received but no email mapping available`);
        return res.status(200).json({ success: true, note: 'stripeCustomerId not mapped — no action taken' });
    } catch (err) {
        console.error('[DISABLE] Error:', err.message);
        return res.status(500).json({ error: 'Failed to disable account' });
    }
}
