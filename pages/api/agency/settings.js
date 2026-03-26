// pages/api/agency/settings.js
// GET / PATCH agency settings (branding, KPIs, Klaviyo)

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/db';
import { encrypt } from '../../../lib/crypto';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const agencyId = session.user.agencyId;

    if (req.method === 'GET') {
        const agency = await prisma.agency.findUnique({
            where: { id: agencyId },
            select: {
                id: true, name: true, tier: true,
                logoUrl: true, brandColor: true, brandName: true,
                reportHeader: true, reportFooter: true,
                customKpis: true,
                klaviyoApiKey: true,
            },
        });
        if (!agency) return res.status(404).json({ error: 'Agency not found' });

        return res.json({
            ...agency,
            customKpis: agency.customKpis ? JSON.parse(agency.customKpis) : [],
            hasKlaviyo: !!agency.klaviyoApiKey,
        });
    }

    if (req.method === 'PATCH') {
        const { name, logoUrl, brandColor, brandName, reportHeader, reportFooter, customKpis, klaviyoApiKey, cogsPercent } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (brandColor !== undefined) updateData.brandColor = brandColor;
        if (brandName !== undefined) updateData.brandName = brandName;
        if (reportHeader !== undefined) updateData.reportHeader = reportHeader;
        if (reportFooter !== undefined) updateData.reportFooter = reportFooter;
        if (customKpis !== undefined) updateData.customKpis = JSON.stringify(customKpis);
        if (klaviyoApiKey !== undefined) updateData.klaviyoApiKey = klaviyoApiKey ? encrypt(klaviyoApiKey) : null;

        const updated = await prisma.agency.update({
            where: { id: agencyId },
            data: updateData,
        });

        return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
