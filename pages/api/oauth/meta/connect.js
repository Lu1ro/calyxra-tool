// pages/api/oauth/meta/connect.js
// Step 1: Redirect user to Meta (Facebook) OAuth consent screen

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const appId = process.env.META_APP_ID;
    if (!appId) return res.status(500).json({ error: 'Meta OAuth not configured. Set META_APP_ID in .env' });

    const state = Buffer.from(JSON.stringify({
        storeId,
        agencyId: session.user.agencyId,
    })).toString('base64url');

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/meta/callback`;
    const scopes = 'ads_read,ads_management,read_insights';

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}` +
        `&scope=${scopes}`;

    res.redirect(authUrl);
}
