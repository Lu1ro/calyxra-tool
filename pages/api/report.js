// pages/api/report.js
// Main API endpoint — receives connection details, fetches real data, runs reconciliation

import { fetchShopifyOrders, processShopifyOrders } from '../../lib/shopify';
import { fetchMetaCampaigns, processMetaCampaigns } from '../../lib/meta';
import { fetchGoogleCampaigns, processGoogleCampaigns } from '../../lib/google';
import { fetchTikTokCampaigns, processTikTokCampaigns } from '../../lib/tiktok';
import { reconcile } from '../../lib/reconcile';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        shopifyDomain,
        shopifyApiKey,
        metaAccessToken,
        metaAdAccountId,
        googleAdsCustomerId,
        googleAdsDeveloperToken,
        tiktokAccessToken,
        tiktokAdvertiserId,
        dateFrom,
        dateTo,
        useSampleData,
    } = req.body;

    try {
        let shopifyData, adData;

        if (useSampleData) {
            // === DEMO MODE — use sample data matching the demo dashboard ===
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
            // === LIVE MODE — fetch real data ===
            if (!shopifyDomain || !shopifyApiKey || !dateFrom || !dateTo) {
                return res.status(400).json({ error: 'Missing required Shopify fields' });
            }
            if (!metaAccessToken && !googleAdsDeveloperToken && !tiktokAccessToken) {
                return res.status(400).json({ error: 'Provide credentials for at least one ad platform (Meta, Google, or TikTok)' });
            }

            // Build fetch promises for all connected platforms
            const fetchPromises = [
                fetchShopifyOrders(shopifyDomain, shopifyApiKey, dateFrom, dateTo),
            ];

            const platformFlags = { meta: false, google: false, tiktok: false };

            if (metaAccessToken && metaAdAccountId) {
                platformFlags.meta = true;
                fetchPromises.push(fetchMetaCampaigns(metaAccessToken, metaAdAccountId, dateFrom, dateTo));
            }
            if (googleAdsDeveloperToken && googleAdsCustomerId) {
                platformFlags.google = true;
                fetchPromises.push(fetchGoogleCampaigns(googleAdsDeveloperToken, googleAdsCustomerId, dateFrom, dateTo));
            }
            if (tiktokAccessToken && tiktokAdvertiserId) {
                platformFlags.tiktok = true;
                fetchPromises.push(fetchTikTokCampaigns(tiktokAccessToken, tiktokAdvertiserId, dateFrom, dateTo));
            }

            // Fetch all in parallel
            const results = await Promise.all(fetchPromises);

            // Process Shopify
            shopifyData = processShopifyOrders(results[0]);

            // Process and merge ad platform data
            let idx = 1;
            let allCampaigns = [];
            let totalSpend = 0;
            let totalPurchases = 0;
            let totalRevenue = 0;

            if (platformFlags.meta) {
                const metaProcessed = processMetaCampaigns(results[idx++]);
                // Tag each campaign with channel
                metaProcessed.campaigns.forEach(c => { c.channel = 'Meta'; });
                allCampaigns.push(...metaProcessed.campaigns);
                totalSpend += metaProcessed.totalSpend;
                totalPurchases += metaProcessed.reportedPurchases;
                totalRevenue += metaProcessed.reportedRevenue;
            }
            if (platformFlags.google) {
                const googleProcessed = processGoogleCampaigns(results[idx++]);
                allCampaigns.push(...googleProcessed.campaigns);
                totalSpend += googleProcessed.totalSpend;
                totalPurchases += googleProcessed.reportedPurchases;
                totalRevenue += googleProcessed.reportedRevenue;
            }
            if (platformFlags.tiktok) {
                const tiktokProcessed = processTikTokCampaigns(results[idx++]);
                allCampaigns.push(...tiktokProcessed.campaigns);
                totalSpend += tiktokProcessed.totalSpend;
                totalPurchases += tiktokProcessed.reportedPurchases;
                totalRevenue += tiktokProcessed.reportedRevenue;
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

        // Run reconciliation
        const report = reconcile(shopifyData, adData);

        return res.status(200).json({
            success: true,
            report,
            meta: {
                dateFrom,
                dateTo,
                generatedAt: new Date().toISOString(),
                isDemo: !!useSampleData,
            },
        });
    } catch (err) {
        console.error('Report generation error:', err);
        return res.status(500).json({
            error: err.message || 'Failed to generate report',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
    }
}
