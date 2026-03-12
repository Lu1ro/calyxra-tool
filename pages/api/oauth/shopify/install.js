// pages/api/oauth/shopify/install.js
// Step 1: Redirect user to Shopify OAuth consent screen

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import crypto from 'crypto';

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { shop, storeId } = req.query;

    if (!shop || !storeId) {
        return res.status(400).json({ error: 'shop and storeId are required' });
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'Shopify OAuth not configured. Set SHOPIFY_CLIENT_ID in .env' });
    }

    // Generate a nonce (state parameter) for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = JSON.stringify({ storeId, nonce, agencyId: session.user.agencyId });
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
