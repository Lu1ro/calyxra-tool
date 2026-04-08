// pages/api/webhooks/shopify/customers-redact.js
// Shopify mandatory compliance webhook: customers/redact
// Called when a store owner requests deletion of customer data

import { verifyShopifyWebhook } from '../../../../lib/shopify-webhook';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    req.body = rawBody;

    if (!verifyShopifyWebhook(req)) {
        return res.status(401).json({ error: 'Invalid HMAC' });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Shopify] customers/redact received:', {
        shop_domain: payload.shop_domain,
        customer_id: payload.customer?.id,
    });

    // Calyxra stores aggregated ad metrics, not individual customer PII.
    // No customer-level data to redact.
    res.status(200).json({});
}
