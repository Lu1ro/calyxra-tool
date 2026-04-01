// pages/api/oauth/google/callback.js
// Step 2: Exchange Google auth code for refresh + access tokens

import { prisma } from '../../../../lib/db';
import { encrypt } from '../../../../lib/crypto';

export default async function handler(req, res) {
    const { code, state } = req.query;

    if (!code || !state) return res.redirect('/dashboard?error=google_auth_failed');

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
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/google/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Google token exchange failed:', tokenData);
            return res.redirect(`/dashboard/stores/${storeId}?error=google_token_failed`);
        }

        // Fetch accessible Google Ads customer IDs
        const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v18';
        let customerId = '';
        let loginCustomerId = '';
        try {
            const customerRes = await fetch(
                `https://googleads.googleapis.com/${apiVersion}/customers:listAccessibleCustomers`,
                {
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    },
                }
            );
            const customerData = await customerRes.json();
            // resourceNames look like "customers/1234567890"
            if (customerData.resourceNames?.length > 0) {
                customerId = customerData.resourceNames[0].split('/')[1] || '';
                // If multiple accounts, first is typically MCC (loginCustomerId)
                if (customerData.resourceNames.length > 1) {
                    loginCustomerId = customerId;
                    customerId = customerData.resourceNames[1].split('/')[1] || customerId;
                }
            }
        } catch (e) {
            console.warn('Could not fetch Google Ads customers:', e.message);
        }

        // Encrypt and save — include clientId/clientSecret so lib/google.js can refresh tokens
        const encryptedCreds = encrypt(JSON.stringify({
            refreshToken: tokenData.refresh_token,
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            customerId,
            loginCustomerId,
            developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        }));

        const existing = await prisma.connection.findFirst({
            where: { storeId, platform: 'google' },
        });

        if (existing) {
            await prisma.connection.update({
                where: { id: existing.id },
                data: { credentials: encryptedCreds, status: 'connected' },
            });
        } else {
            await prisma.connection.create({
                data: { platform: 'google', credentials: encryptedCreds, status: 'connected', storeId },
            });
        }

        return res.redirect(`/dashboard/stores/${storeId}?connected=google`);
    } catch (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`/dashboard/stores/${storeId}?error=google_error`);
    }
}
