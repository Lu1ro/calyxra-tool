// pages/api/oauth/tiktok/callback.js
// Step 2: Exchange TikTok auth code for access token

import { prisma } from '../../../../lib/db';
import { encrypt } from '../../../../lib/crypto';

export default async function handler(req, res) {
    const { auth_code, state } = req.query;

    if (!auth_code || !state) return res.redirect('/dashboard?error=tiktok_auth_failed');

    let stateData;
    try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
        return res.redirect('/dashboard?error=invalid_state');
    }

    const { storeId, agencyId } = stateData;
    const store = await prisma.store.findFirst({ where: { id: storeId, agencyId } });
    if (!store) return res.redirect('/dashboard?error=store_not_found');

    try {
        // Exchange auth code for access token
        const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: process.env.TIKTOK_APP_ID,
                secret: process.env.TIKTOK_APP_SECRET,
                auth_code,
            }),
        });

        const tokenData = await tokenRes.json();
        const data = tokenData.data;

        if (!data?.access_token) {
            console.error('TikTok token exchange failed:', tokenData);
            return res.redirect(`/dashboard/stores/${storeId}?error=tiktok_token_failed`);
        }

        // Encrypt and save
        const encryptedCreds = encrypt(JSON.stringify({
            accessToken: data.access_token,
            advertiserId: data.advertiser_ids?.[0] || '',
            advertiserIds: data.advertiser_ids || [],
        }));

        const existing = await prisma.connection.findFirst({
            where: { storeId, platform: 'tiktok' },
        });

        if (existing) {
            await prisma.connection.update({
                where: { id: existing.id },
                data: { credentials: encryptedCreds, status: 'connected' },
            });
        } else {
            await prisma.connection.create({
                data: { platform: 'tiktok', credentials: encryptedCreds, status: 'connected', storeId },
            });
        }

        return res.redirect(`/dashboard/stores/${storeId}?connected=tiktok`);
    } catch (err) {
        console.error('TikTok OAuth error:', err);
        return res.redirect(`/dashboard/stores/${storeId}?error=tiktok_error`);
    }
}
