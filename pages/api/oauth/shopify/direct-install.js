// pages/api/oauth/shopify/direct-install.js
// Direct install endpoint for Custom Distribution
// Used when a merchant clicks the install link from Shopify Partners
// No session required — the merchant is NOT logged into our app yet

import crypto from 'crypto';

export default async function handler(req, res) {
    const { shop } = req.query;

    if (!shop) {
        return res.status(400).json({ error: 'shop parameter is required' });
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'Shopify OAuth not configured' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    // For direct install, we don't have storeId or agencyId yet
    // The callback will handle matching/creating the store
    const state = JSON.stringify({ nonce, directInstall: true });
    const encodedState = Buffer.from(state).toString('base64url');

    const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,read_products';
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/shopify/callback`;
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

    const installUrl = `https://${shopDomain}/admin/oauth/authorize` +
        `?client_id=${clientId}` +
        `&scope=${scopes}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodedState}`;

    res.redirect(installUrl);
}
