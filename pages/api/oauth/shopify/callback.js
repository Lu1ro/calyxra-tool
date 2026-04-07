// pages/api/oauth/shopify/callback.js
// Step 2: Exchange Shopify auth code for permanent access token
// Supports both:
// 1. Normal flow (from wizard/settings) — has storeId + agencyId in state
// 2. Direct install flow (Custom Distribution) — has directInstall: true in state

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

    // ----- Exchange code for access token (same for both flows) -----
    let tokenData;
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
        tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Shopify token exchange failed:', tokenData);
            return res.redirect('/dashboard?error=token_exchange_failed');
        }
    } catch (err) {
        console.error('Shopify token exchange error:', err);
        return res.redirect('/dashboard?error=shopify_error');
    }

    // Encrypt credentials
    const encryptedCreds = encrypt(JSON.stringify({
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        domain: shop,
    }));

    // ----- FLOW A: Direct Install (Custom Distribution) -----
    if (stateData.directInstall) {
        try {
            // Check if a store with this domain already exists
            let store = await prisma.store.findFirst({
                where: { domain: shop },
                include: { agency: true },
            });

            if (store) {
                // Store exists — upsert connection
                const existing = await prisma.connection.findFirst({
                    where: { storeId: store.id, platform: 'shopify' },
                });

                if (existing) {
                    await prisma.connection.update({
                        where: { id: existing.id },
                        data: { credentials: encryptedCreds, status: 'connected' },
                    });
                } else {
                    await prisma.connection.create({
                        data: { platform: 'shopify', credentials: encryptedCreds, status: 'connected', storeId: store.id },
                    });
                }

                // Redirect to dashboard — the user needs to log in
                const dashboardUrl = `${process.env.NEXTAUTH_URL || 'https://app.calyxra.com'}/dashboard/stores/${store.id}?connected=shopify`;
                return res.redirect(dashboardUrl);
            }

            // Store doesn't exist — redirect to registration with shop info
            // After they register, they can create the store and it will already be connected
            const dashboardUrl = `${process.env.NEXTAUTH_URL || 'https://app.calyxra.com'}/register?shop=${encodeURIComponent(shop)}&installed=true`;
            return res.redirect(dashboardUrl);

        } catch (err) {
            console.error('Direct install error:', err);
            return res.redirect('/dashboard?error=install_error');
        }
    }

    // ----- FLOW B: Normal flow (from wizard/settings) -----
    const { storeId, agencyId } = stateData;

    // Verify store belongs to agency
    const store = await prisma.store.findFirst({ where: { id: storeId, agencyId } });
    if (!store) return res.redirect('/dashboard?error=store_not_found');

    try {
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

        // If we came from the add wizard, return there
        if (stateData.returnTo === 'wizard') {
            return res.redirect(`/dashboard/stores/add?storeId=${storeId}&step=2&connected=shopify`);
        }

        // Default: redirect to store dashboard
        return res.redirect(`/dashboard/stores/${storeId}?connected=shopify`);
    } catch (err) {
        console.error('Shopify OAuth error:', err);
        return res.redirect(`/dashboard/stores/${storeId}?error=shopify_error`);
    }
}
