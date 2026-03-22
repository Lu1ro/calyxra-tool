// pages/api/agency/upload-logo.js
// Handles logo upload — stores as base64 data URL in database

import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/db';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '2mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { fileData, fileType } = req.body;

        if (!fileData) {
            return res.status(400).json({ error: 'Missing file data' });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (fileType && !allowedTypes.includes(fileType)) {
            return res.status(400).json({ error: 'Only PNG, JPG, SVG, and WebP files are allowed' });
        }

        // Validate size — base64 is ~33% larger than original
        const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large. Maximum 2MB.' });
        }

        // fileData is already a data URL (data:image/png;base64,...) — store it directly
        const logoUrl = fileData;

        // Save to database
        await prisma.agency.update({
            where: { id: session.user.agencyId },
            data: { logoUrl },
        });

        return res.status(200).json({ logoUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'Failed to upload logo' });
    }
}
