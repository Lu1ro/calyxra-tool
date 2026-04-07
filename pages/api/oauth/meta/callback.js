// pages/api/oauth/meta/callback.js
// Step 2: Exchange Meta auth code for access token, then fetch ad accounts

import { prisma } from '../../../../lib/db';
import { encrypt } from '../../../../lib/crypto';

export default async function handler(req, res) {
    const { code, state } = req.query;

    if (!code || !state) return res.redirect('/dashboard?error=meta_auth_failed');

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
        // Exchange code for short-lived token
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/meta/callback`;
        const tokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token` +
            `?client_id=${process.env.META_APP_ID}` +
            `&client_secret=${process.env.META_APP_SECRET}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&code=${code}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Meta token exchange failed:', tokenData);
            return res.redirect(`/dashboard/stores/${storeId}?error=meta_token_failed`);
        }

        // Exchange for long-lived token (60 days)
        const longTokenRes = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token` +
            `?grant_type=fb_exchange_token` +
            `&client_id=${process.env.META_APP_ID}` +
            `&client_secret=${process.env.META_APP_SECRET}` +
            `&fb_exchange_token=${tokenData.access_token}`
        );
        const longTokenData = await longTokenRes.json();
        const accessToken = longTokenData.access_token || tokenData.access_token;

        // Get ad accounts
        const accountsRes = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
        );
        const accountsData = await accountsRes.json();
        const adAccountId = accountsData.data?.[0]?.id || '';

        // Encrypt and save
        const encryptedCreds = encrypt(JSON.stringify({
            accessToken,
            adAccountId,
            adAccounts: accountsData.data || [],
            expiresAt: longTokenData.expires_in
                ? new Date(Date.now() + longTokenData.expires_in * 1000).toISOString()
                : null,
        }));

        const existing = await prisma.connection.findFirst({
            where: { storeId, platform: 'meta' },
        });

        if (existing) {
            await prisma.connection.update({
                where: { id: existing.id },
                data: { credentials: encryptedCreds, status: 'connected' },
            });
        } else {
            await prisma.connection.create({
                data: { platform: 'meta', credentials: encryptedCreds, status: 'connected', storeId },
            });
        }

        // If we came from the add wizard, return there
        if (stateData.returnTo === 'wizard') {
            return res.redirect(`/dashboard/stores/add?storeId=${storeId}&step=2&connected=meta`);
        }
        return res.redirect(`/dashboard/stores/${storeId}?connected=meta`);
    } catch (err) {
        console.error('Meta OAuth error:', err);
        return res.redirect(`/dashboard/stores/${storeId}?error=meta_error`);
    }
}
