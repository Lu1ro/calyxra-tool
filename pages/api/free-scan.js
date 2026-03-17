// pages/api/free-scan.js | Public free scan endpoint — no auth, no DB, in-memory only

import { fetchShopifyOrders, processShopifyOrders } from '../../lib/shopify';
import { fetchMetaCampaigns, processMetaCampaigns } from '../../lib/meta';
import { reconcile } from '../../lib/reconcile';

export default async function handler(req, res) {
    // CORS — allow marketing site to call this endpoint
    const allowedOrigin = process.env.MARKETING_SITE_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        shopifyDomain,
        shopifyApiKey,
        metaAccessToken,
        metaAdAccountId,
        dateFrom,
        dateTo,
        useSampleData,
    } = req.body || {};

    try {
        let shopifyData, adData;

        if (useSampleData) {
            // ── DEMO MODE — same sample data as report.js ──
            shopifyData = {
                totalOrders: 1980,
                grossRevenue: 231040,
                totalDiscounts: 22450,
                totalRefunds: 23320,
                chargebacks: 2750,
                netRevenue: 180520,
                refundedOrders: 92,
            };

            adData = {
                totalSpend: 62452,
                reportedPurchases: 2685,
                reportedRevenue: 268440,
                reportedRoas: 4.30,
                campaigns: [
                    { campaignName: 'PMax - Best Sellers', spend: 18500, impressions: 245000, clicks: 5100, purchases: 612, purchaseValue: 68500, reportedRoas: 3.70, channel: 'Google' },
                    { campaignName: 'Search - Brand', spend: 2100, impressions: 45000, clicks: 3200, purchases: 380, purchaseValue: 35200, reportedRoas: 16.76, channel: 'Google' },
                    { campaignName: 'TikTok - UGC Scaling', spend: 11800, impressions: 840000, clicks: 9200, purchases: 490, purchaseValue: 37400, reportedRoas: 3.17, channel: 'TikTok' },
                    { campaignName: 'Prospecting - Broad', spend: 12400, impressions: 186000, clicks: 3720, purchases: 487, purchaseValue: 51520, reportedRoas: 4.15, channel: 'Meta' },
                    { campaignName: 'Retargeting - Remarketing 7d', spend: 6200, impressions: 78400, clicks: 2460, purchases: 392, purchaseValue: 52440, reportedRoas: 8.46, channel: 'Meta' },
                    { campaignName: 'Lookalike - 1%', spend: 5800, impressions: 87000, clicks: 1914, purchases: 213, purchaseValue: 15530, reportedRoas: 2.68, channel: 'Meta' },
                    { campaignName: 'Brand Awareness', spend: 5652, impressions: 436800, clicks: 2616, purchases: 111, purchaseValue: 7850, reportedRoas: 1.39, channel: 'Meta' },
                ],
            };
        } else {
            // ── LIVE MODE — fetch real data ──
            if (!shopifyDomain || !shopifyApiKey) {
                return res.status(400).json({ error: 'Shopify domain and API key are required' });
            }

            // Default date range: last 30 days
            const dTo = dateTo || new Date().toISOString().split('T')[0];
            const dFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Fetch Shopify orders
            let rawOrders;
            try {
                rawOrders = await fetchShopifyOrders(shopifyDomain, shopifyApiKey, dFrom, dTo);
            } catch (err) {
                return res.status(400).json({
                    error: 'Shopify connection failed',
                    detail: err.message,
                });
            }
            shopifyData = processShopifyOrders(rawOrders);

            // Fetch Meta campaigns (optional, non-blocking)
            let allCampaigns = [];
            let totalSpend = 0;
            let totalPurchases = 0;
            let totalRevenue = 0;

            if (metaAccessToken && metaAdAccountId) {
                try {
                    const rawMeta = await fetchMetaCampaigns(metaAccessToken, metaAdAccountId, dFrom, dTo);
                    const metaProcessed = processMetaCampaigns(rawMeta);
                    metaProcessed.campaigns.forEach(c => { c.channel = 'Meta'; });
                    allCampaigns.push(...metaProcessed.campaigns);
                    totalSpend += metaProcessed.totalSpend;
                    totalPurchases += metaProcessed.reportedPurchases;
                    totalRevenue += metaProcessed.reportedRevenue;
                } catch (err) {
                    console.warn('[FREE-SCAN] Meta fetch failed (non-blocking):', err.message);
                }
            }

            adData = {
                totalSpend: Math.round(totalSpend * 100) / 100,
                reportedPurchases: totalPurchases,
                reportedRevenue: Math.round(totalRevenue * 100) / 100,
                reportedRoas: totalSpend > 0
                    ? Math.round((totalRevenue / totalSpend) * 100) / 100
                    : 0,
                campaigns: allCampaigns.sort((a, b) => b.reportedRoas - a.reportedRoas),
            };
        }

        // Run reconciliation IN MEMORY — no DB writes
        const report = reconcile(shopifyData, adData);

        return res.status(200).json({
            success: true,
            report,
            meta: {
                isDemo: !!useSampleData,
                stored: false,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (err) {
        console.error('[FREE-SCAN] Error:', err.message);
        return res.status(500).json({
            error: err.message || 'Failed to generate report',
        });
    }
}
