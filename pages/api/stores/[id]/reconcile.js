// pages/api/stores/[id]/reconcile.js
// Run reconciliation for a specific store using stored credentials, save results

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';
import { decrypt } from '../../../../lib/crypto';
import { fetchShopifyOrders, processShopifyOrders, fetchShopifySalesAnalytics } from '../../../../lib/shopify';
import { fetchMetaCampaigns } from '../../../../lib/meta';

import { fetchTikTokCampaigns } from '../../../../lib/tiktok';
import { reconcile } from '../../../../lib/reconcile';
import { evaluateAlerts, saveAlerts } from '../../../../lib/alerts';
import { fetchGA4Data, refreshAccessToken, generateSampleGA4Data } from '../../../../lib/ga4';
import { computeKPIs } from '../../../../lib/kpis';
import { generateRecommendations, getQuickSummary } from '../../../../lib/optimizer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const agencyId = session.user.agencyId;
    const { useSampleData } = req.body || {};

    // Verify store ownership
    const store = await prisma.store.findFirst({
        where: { id, agencyId },
        include: { connections: true },
    });

    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }

    try {
        let shopifyData, adData;
        const warnings = [];

        if (useSampleData) {
            // Use demo data for testing
            shopifyData = {
                grossRevenue: 245320,
                netRevenue: 180120,
                totalDiscounts: 32400,
                totalRefunds: 28800,
                chargebacks: 4000,
                totalOrders: 3842,
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
            // Decrypt credentials and fetch real data
            const creds = {};
            for (const conn of store.connections) {
                creds[conn.platform] = JSON.parse(decrypt(conn.credentials));
            }

            if (!creds.shopify) {
                return res.status(400).json({ error: 'Shopify connection required' });
            }

            // Determine date range (last 30 days)
            const dateTo = new Date().toISOString().split('T')[0];
            const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Fetch Shopify orders and process into metrics
            const shopifyOrders = await fetchShopifyOrders(
                creds.shopify.domain || store.domain,
                creds.shopify.apiKey,
                dateFrom,
                dateTo
            );
            const processedShopify = processShopifyOrders(shopifyOrders);

            // Try ShopifyQL analytics for EXACT match with Shopify Analytics dashboard
            const analyticsData = await fetchShopifySalesAnalytics(
                creds.shopify.domain || store.domain,
                creds.shopify.apiKey,
                dateFrom,
                dateTo
            );

            // If ShopifyQL is available, override REST API numbers with analytics numbers
            if (analyticsData) {
                console.log('[RECONCILE] Using ShopifyQL analytics (exact match with Shopify)');
                processedShopify.grossRevenue = analyticsData.grossRevenue;
                processedShopify.netRevenue = analyticsData.netRevenue;
                processedShopify.totalDiscounts = analyticsData.totalDiscounts;
                processedShopify.totalRefunds = analyticsData.totalRefunds;
            } else {
                console.log('[RECONCILE] Using REST API orders (ShopifyQL unavailable)');
            }

            // Fetch ad platform data — use allSettled so one failure doesn't kill everything
            const adFetchers = [];
            const adLabels = [];

            if (creds.meta) {
                adFetchers.push(fetchMetaCampaigns(creds.meta.accessToken, creds.meta.adAccountId, dateFrom, dateTo).then(c => c.map(x => ({ ...x, channel: 'Meta' }))));
                adLabels.push('Meta');
            }

            if (creds.tiktok) {
                adFetchers.push(fetchTikTokCampaigns(creds.tiktok.accessToken, creds.tiktok.advertiserId, dateFrom, dateTo).then(c => c.map(x => ({ ...x, channel: 'TikTok' }))));
                adLabels.push('TikTok');
            }

            const adResults = await Promise.allSettled(adFetchers);
            const allCampaigns = [];

            adResults.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    allCampaigns.push(...result.value);
                } else {
                    warnings.push({
                        type: 'platform_error',
                        platform: adLabels[i],
                        message: `${adLabels[i]} data fetch failed: ${result.reason?.message || 'Unknown error'}`,
                    });
                }
            });

            // Add Shopify debug info
            if (processedShopify._debug) {
                if (processedShopify._debug.skippedTest > 0) {
                    warnings.push({ type: 'info', message: `Excluded ${processedShopify._debug.skippedTest} test order(s) from revenue calculation` });
                }
                if (processedShopify._debug.skippedCancelled > 0) {
                    warnings.push({ type: 'info', message: `Excluded ${processedShopify._debug.skippedCancelled} cancelled order(s) from revenue calculation` });
                }
            }

            shopifyData = processedShopify;
            adData = {
                totalSpend: allCampaigns.reduce((s, c) => s + c.spend, 0),
                reportedPurchases: allCampaigns.reduce((s, c) => s + c.purchases, 0),
                reportedRevenue: allCampaigns.reduce((s, c) => s + c.purchaseValue, 0),
                reportedRoas: 0,
                campaigns: allCampaigns,
            };
            adData.reportedRoas = adData.totalSpend > 0 ? +(adData.reportedRevenue / adData.totalSpend).toFixed(2) : 0;

            // Update connection sync times (only for successful ones)
            for (const conn of store.connections) {
                try {
                    await prisma.connection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
                } catch (e) { /* non-critical */ }
            }
        }

        // Fetch GA4 data if available
        let ga4Data = null;
        if (useSampleData) {
            ga4Data = generateSampleGA4Data();
        } else {
            const ga4Conn = store.connections.find(c => c.platform === 'ga4');
            if (ga4Conn) {
                try {
                    const ga4Creds = JSON.parse(decrypt(ga4Conn.credentials));
                    let accessToken = ga4Creds.accessToken;
                    // Refresh token if needed
                    if (ga4Creds.refreshToken) {
                        accessToken = await refreshAccessToken(ga4Creds.refreshToken);
                    }
                    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const dateTo = new Date().toISOString().split('T')[0];
                    ga4Data = await fetchGA4Data(accessToken, ga4Creds.propertyId, dateFrom, dateTo);
                } catch (e) {
                    console.warn('GA4 fetch failed:', e.message);
                    // Continue without GA4 — non-blocking
                }
            }
        }

        // Run reconciliation (with optional GA4 3-way)
        const result = reconcile(shopifyData, adData, ga4Data);

        // Compute KPIs
        const kpis = computeKPIs(result);

        // Wrap in a structured format for the frontend
        const report = {
            shopify: {
                grossRevenue: result.grossRevenue,
                netRevenue: result.shopifyNetRevenue,
                totalDiscounts: result.totalDiscounts,
                totalRefunds: result.totalRefunds,
                chargebacks: result.chargebacks,
                totalOrders: result.actualOrders,
            },
            adPlatform: {
                reportedRevenue: result.metaReportedRevenue,
                totalSpend: result.totalSpend,
                reportedRoas: result.reportedRoas,
                reportedPurchases: result.reportedPurchases,
            },
            phantomRevenue: result.phantomRevenue,
            phantomPct: result.phantomPct,
            trueRoas: result.trueRoas,
            roasOverstatement: result.roasOverstatement,
            trueCpa: result.trueCpa,
            phantomPurchases: result.phantomPurchases,
            gapBreakdown: {
                discountLeak: result.gapDecomposition?.[0]?.value || 0,
                refundLeak: result.gapDecomposition?.[1]?.value || 0,
                chargebacks: result.gapDecomposition?.[2]?.value || 0,
                platformOverlap: result.gapDecomposition?.[3]?.value || 0,
            },
            gapDecomposition: result.gapDecomposition,
            campaigns: result.campaigns,
            annualizedPhantom: result.annualizedPhantom,
            budgetAtRisk: result.budgetAtRisk,
            ga4: result.ga4,
            kpis,
            // Phase 6: Action Engine
            optimizer: (() => {
                const { actions, summary } = generateRecommendations(result.campaigns, result.totalSpend);
                return { actions, summary, quickSummary: getQuickSummary(summary) };
            })(),
        };

        // Save to database
        const savedReport = await prisma.report.create({
            data: {
                storeId: id,
                dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0],
                isDemo: !!useSampleData,
                grossRevenue: report.shopify.grossRevenue,
                netRevenue: report.shopify.netRevenue,
                totalDiscounts: report.shopify.totalDiscounts,
                totalRefunds: report.shopify.totalRefunds,
                chargebacks: report.shopify.chargebacks,
                totalOrders: report.shopify.totalOrders,
                reportedRevenue: report.adPlatform.reportedRevenue,
                totalSpend: report.adPlatform.totalSpend,
                reportedRoas: report.adPlatform.reportedRoas,
                trueRoas: report.trueRoas,
                phantomRevenue: report.phantomRevenue,
                phantomPct: report.phantomPct,
                fullReport: JSON.stringify(report),
                campaigns: {
                    create: report.campaigns.map(c => ({
                        campaignName: c.campaignName,
                        channel: c.channel || 'Meta',
                        spend: c.spend,
                        reportedRoas: c.reportedRoas,
                        estimatedTrueRoas: c.estimatedTrueRoas,
                        inflationRatio: c.inflationRatio,
                        flag: c.flag,
                        flagColor: c.flagColor,
                    })),
                },
            },
            include: { campaigns: true },
        });

        // Evaluate alert rules
        const triggered = await evaluateAlerts(id, savedReport);
        let savedAlerts = [];
        if (triggered.length > 0) {
            savedAlerts = await saveAlerts(id, savedReport.id, triggered);
        }

        return res.status(200).json({ report, savedReportId: savedReport.id, alerts: triggered, warnings: warnings || [] });
    } catch (err) {
        console.error('Reconciliation error:', err);
        return res.status(500).json({ error: 'Reconciliation failed: ' + err.message });
    }
}
