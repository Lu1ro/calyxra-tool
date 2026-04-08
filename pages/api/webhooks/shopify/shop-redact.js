// pages/api/webhooks/shopify/shop-redact.js
// Shopify mandatory compliance webhook: shop/redact
// Called 48 hours after a store uninstalls the app

import { prisma } from '../../../../lib/db';
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
    const shopDomain = payload.shop_domain;

    console.log('[Shopify] shop/redact received:', { shop_domain: shopDomain });

    try {
        // Find and delete the Shopify connection for this shop
        const store = await prisma.store.findFirst({
            where: { domain: shopDomain },
        });

        if (store) {
            await prisma.connection.deleteMany({
                where: { storeId: store.id, platform: 'shopify' },
            });
            console.log(`[Shopify] Deleted shopify connection for store ${store.id} (${shopDomain})`);
        }
    } catch (err) {
        console.error('[Shopify] shop/redact error:', err);
    }

    res.status(200).json({});
}
