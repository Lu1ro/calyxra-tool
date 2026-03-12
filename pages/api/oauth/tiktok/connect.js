// pages/api/oauth/tiktok/connect.js
// Step 1: Redirect user to TikTok for Business OAuth consent screen

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const appId = process.env.TIKTOK_APP_ID;
    if (!appId) return res.status(500).json({ error: 'TikTok OAuth not configured. Set TIKTOK_APP_ID in .env' });

    const state = Buffer.from(JSON.stringify({
        storeId,
        agencyId: session.user.agencyId,
    })).toString('base64url');

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/tiktok/callback`;

    const authUrl = `https://business-api.tiktok.com/portal/auth` +
        `?app_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

    res.redirect(authUrl);
}
