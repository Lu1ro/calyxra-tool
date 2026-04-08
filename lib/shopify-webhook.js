// lib/shopify-webhook.js
// HMAC verification for Shopify webhooks (compliance + standard)

import crypto from 'crypto';

export function verifyShopifyWebhook(req) {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    if (!hmacHeader) return false;

    const secret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!secret) return false;

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const computed = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
}
