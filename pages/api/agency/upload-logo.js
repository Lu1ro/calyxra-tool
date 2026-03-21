// pages/api/agency/upload-logo.js
// Handles logo file upload — saves to /public/uploads/ and returns URL

import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import fs from 'fs';
import path from 'path';

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
        const { fileName, fileData, fileType } = req.body;

        if (!fileName || !fileData) {
            return res.status(400).json({ error: 'Missing file data' });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({ error: 'Only PNG, JPG, SVG, and WebP files are allowed' });
        }

        // Validate file size (max 2MB)
        const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large. Maximum 2MB.' });
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(fileName) || '.png';
        const safeName = `logo-${session.user.agencyId || 'agency'}-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, safeName);

        // Write file
        fs.writeFileSync(filePath, buffer);

        // Return relative URL
        const logoUrl = `/uploads/${safeName}`;

        return res.status(200).json({ logoUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'Failed to upload file' });
    }
}
