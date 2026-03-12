// pages/api/oauth/shopify/callback.js
// Step 2: Exchange Shopify auth code for permanent access token

import { prisma } from '../../../../lib/db';
import { encrypt } from '../../../../lib/crypto';

export default async function handler(req, res) {
    const { code, shop, state } = req.query;

    if (!code || !shop || !state) {
        return res.redirect('/dashboard?error=shopify_auth_failed');
    }

    // Decode state
    let stateData;
    try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
        return res.redirect('/dashboard?error=invalid_state');
    }

    const { storeId, agencyId } = stateData;

    // Verify store belongs to agency
    const store = await prisma.store.findFirst({ where: { id: storeId, agencyId } });
    if (!store) return res.redirect('/dashboard?error=store_not_found');

    // Exchange code for access token
    try {
        const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Shopify token exchange failed:', tokenData);
            return res.redirect(`/dashboard/stores/${storeId}?error=token_exchange_failed`);
        }

        // Encrypt and save
        const encryptedCreds = encrypt(JSON.stringify({
            accessToken: tokenData.access_token,
            scope: tokenData.scope,
            domain: shop,
        }));

        // Upsert connection
        const existing = await prisma.connection.findFirst({
            where: { storeId, platform: 'shopify' },
        });

        if (existing) {
            await prisma.connection.update({
                where: { id: existing.id },
                data: { credentials: encryptedCreds, status: 'connected' },
            });
        } else {
            await prisma.connection.create({
                data: { platform: 'shopify', credentials: encryptedCreds, status: 'connected', storeId },
            });
        }

        // Update store domain if needed
        await prisma.store.update({
            where: { id: storeId },
            data: { domain: shop },
        });

        return res.redirect(`/dashboard/stores/${storeId}?connected=shopify`);
    } catch (err) {
        console.error('Shopify OAuth error:', err);
        return res.redirect(`/dashboard/stores/${storeId}?error=shopify_error`);
    }
}
