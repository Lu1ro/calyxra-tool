// pages/api/agency.js
// Returns the current agency's profile (tier, name, etc.)
import { prisma } from '../../lib/db';
import { withAuth, withErrorHandler, withMethods } from '../../lib/middleware';

async function handler(req, res) {
    const agencyId = req.session.user.agencyId;

    const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            totalStoresEver: true,
            brandColor: true,
            brandName: true,
            logoUrl: true,
        },
    });

    if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
    }

    return res.status(200).json(agency);
}

export default withErrorHandler(withAuth(withMethods(handler, ['GET'])));
