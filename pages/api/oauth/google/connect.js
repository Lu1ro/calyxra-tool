// pages/api/oauth/google/connect.js
// Step 1: Redirect user to Google OAuth consent screen for Google Ads

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env' });

    const state = Buffer.from(JSON.stringify({
        storeId,
        agencyId: session.user.agencyId,
    })).toString('base64url');

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/google/callback`;
    const scopes = 'https://www.googleapis.com/auth/adwords';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${state}`;

    res.redirect(authUrl);
}
