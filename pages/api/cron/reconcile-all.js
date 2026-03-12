// pages/api/cron/reconcile-all.js
// Automated daily reconciliation for all active stores
// Trigger via: curl -H "Authorization: Bearer $CRON_SECRET" POST /api/cron/reconcile-all
// Or use Vercel Cron: vercel.json → { "crons": [{ "path": "/api/cron/reconcile-all", "schedule": "0 6 * * *" }] }

import { prisma } from '../../../lib/db';
import { decrypt } from '../../../lib/crypto';
import { fetchShopifyData } from '../../../lib/shopify';
import { fetchMetaCampaigns } from '../../../lib/meta';
import { fetchGoogleCampaigns } from '../../../lib/google';
import { fetchTikTokCampaigns } from '../../../lib/tiktok';
import { reconcile } from '../../../lib/reconcile';
import { evaluateAlerts, saveAlerts } from '../../../lib/alerts';
import { sendEmailAlert, sendSlackAlert } from '../../../lib/notify';

export default async function handler(req, res) {
    // Verify cron secret (supports both header auth and Vercel cron)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Also allow Vercel's cron verification
        if (req.headers['x-vercel-cron'] !== '1' || !cronSecret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const results = [];
    const errors = [];

    try {
        // Get all active stores with connections
        const stores = await prisma.store.findMany({
            where: { status: 'active' },
            include: {
                connections: true,
                agency: { select: { email: true, name: true, tier: true } },
            },
        });

        console.log(`[Cron] Starting reconciliation for ${stores.length} stores`);

        for (const store of stores) {
            try {
                // Skip stores without Shopify connection
                const shopifyConn = store.connections.find(c => c.platform === 'shopify');
                if (!shopifyConn) {
                    results.push({ storeId: store.id, name: store.name, status: 'skipped', reason: 'No Shopify connection' });
                    continue;
                }

                // Decrypt credentials
                const creds = {};
                for (const conn of store.connections) {
                    try {
                        creds[conn.platform] = JSON.parse(decrypt(conn.credentials));
                    } catch (e) {
                        console.error(`[Cron] Failed to decrypt ${conn.platform} for ${store.name}:`, e.message);
                        // Create an API failure alert
                        await prisma.alert.create({
                            data: {
                                storeId: store.id,
                                type: 'api_failure',
                                severity: 'high',
                                title: `${conn.platform} credentials expired or invalid`,
                                message: `Could not decrypt ${conn.platform} credentials for ${store.name}. Please reconnect.`,
                            },
                        });
                    }
                }

                if (!creds.shopify) {
                    results.push({ storeId: store.id, name: store.name, status: 'error', reason: 'Shopify decryption failed' });
                    continue;
                }

                // Date range: last 30 days
                const dateTo = new Date().toISOString().split('T')[0];
                const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                // Fetch Shopify data
                let shopifyData;
                try {
                    shopifyData = await fetchShopifyData(
                        creds.shopify.domain || store.domain,
                        creds.shopify.accessToken || creds.shopify.apiKey,
                        dateFrom, dateTo
                    );
                } catch (e) {
                    console.error(`[Cron] Shopify fetch failed for ${store.name}:`, e.message);
                    await prisma.alert.create({
                        data: {
                            storeId: store.id,
                            type: 'api_failure',
                            severity: 'critical',
                            title: `Shopify data fetch failed`,
                            message: `Error: ${e.message}. Check your Shopify connection.`,
                        },
                    });
                    // Update connection status
                    await prisma.connection.update({ where: { id: shopifyConn.id }, data: { status: 'error' } });
                    results.push({ storeId: store.id, name: store.name, status: 'error', reason: 'Shopify API error' });
                    continue;
                }

                // Fetch ad platform data in parallel
                const adFetchers = [];
                if (creds.meta) {
                    adFetchers.push(
                        fetchMetaCampaigns(creds.meta.accessToken, creds.meta.adAccountId, dateFrom, dateTo)
                            .then(c => c.map(x => ({ ...x, channel: 'Meta' })))
                            .catch(e => { console.error(`[Cron] Meta failed for ${store.name}:`, e.message); return []; })
                    );
                }
                if (creds.google) {
                    adFetchers.push(
                        fetchGoogleCampaigns(creds.google.developerToken, creds.google.customerId, dateFrom, dateTo)
                            .then(c => c.map(x => ({ ...x, channel: 'Google' })))
                            .catch(e => { console.error(`[Cron] Google failed for ${store.name}:`, e.message); return []; })
                    );
                }
                if (creds.tiktok) {
                    adFetchers.push(
                        fetchTikTokCampaigns(creds.tiktok.accessToken, creds.tiktok.advertiserId, dateFrom, dateTo)
                            .then(c => c.map(x => ({ ...x, channel: 'TikTok' })))
                            .catch(e => { console.error(`[Cron] TikTok failed for ${store.name}:`, e.message); return []; })
                    );
                }

                const adResults = await Promise.all(adFetchers);
                const allCampaigns = adResults.flat();

                const adData = {
                    totalSpend: allCampaigns.reduce((s, c) => s + c.spend, 0),
                    reportedPurchases: allCampaigns.reduce((s, c) => s + c.purchases, 0),
                    reportedRevenue: allCampaigns.reduce((s, c) => s + c.purchaseValue, 0),
                    reportedRoas: 0,
                    campaigns: allCampaigns,
                };
                adData.reportedRoas = adData.totalSpend > 0 ? +(adData.reportedRevenue / adData.totalSpend).toFixed(2) : 0;

                // Run reconciliation
                const result = reconcile(shopifyData, adData);

                // Structure the report
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
                };

                // Save to database
                const savedReport = await prisma.report.create({
                    data: {
                        storeId: store.id,
                        dateFrom,
                        dateTo,
                        isDemo: false,
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
                });

                // Update sync timestamps
                for (const conn of store.connections) {
                    await prisma.connection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
                }

                // Evaluate alert rules
                const triggered = await evaluateAlerts(store.id, savedReport);

                if (triggered.length > 0) {
                    // Save alerts to DB
                    await saveAlerts(store.id, savedReport.id, triggered);

                    // Send notifications
                    await sendEmailAlert(store.agency.email, triggered, store.name);
                    await sendSlackAlert(triggered, store.name);
                }

                results.push({
                    storeId: store.id,
                    name: store.name,
                    status: 'success',
                    reportId: savedReport.id,
                    alerts: triggered.length,
                });

                console.log(`[Cron] ✅ ${store.name}: report saved, ${triggered.length} alerts`);

            } catch (err) {
                console.error(`[Cron] ❌ ${store.name}:`, err.message);
                errors.push({ storeId: store.id, name: store.name, error: err.message });
            }
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            processed: results.length,
            errors: errors.length,
            results,
            errors: errors,
        });

    } catch (err) {
        console.error('[Cron] Fatal error:', err);
        return res.status(500).json({ error: 'Cron job failed: ' + err.message });
    }
}
