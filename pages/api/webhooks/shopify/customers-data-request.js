// pages/api/webhooks/shopify/customers-data-request.js
// Shopify mandatory compliance webhook: customers/data_request
// Called when a customer requests their data under GDPR

import { verifyShopifyWebhook } from '../../../../lib/shopify-webhook';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // Read raw body for HMAC verification
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    req.body = rawBody;

    if (!verifyShopifyWebhook(req)) {
        return res.status(401).json({ error: 'Invalid HMAC' });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Shopify] customers/data_request received:', {
        shop_domain: payload.shop_domain,
        customer_id: payload.customer?.id,
        orders_requested: payload.orders_requested?.length || 0,
    });

    // Calyxra stores aggregated ad metrics, not individual customer PII.
    // No customer-level data to export.
    res.status(200).json({});
}
