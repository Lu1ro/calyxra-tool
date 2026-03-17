// lib/reconcile.js
// Core reconciliation logic — compares Ad Platform reported vs Shopify net revenue
// Optionally includes GA4 data for 3-way truth comparison

/**
 * Run the full reconciliation between Shopify and Ad Platform data
 * Optionally includes GA4 data for 3-way reconciliation
 */
function reconcile(shopifyData, metaData, ga4Data = null) {
    const {
        totalOrders,
        grossRevenue,
        totalDiscounts,
        totalRefunds,
        chargebacks,
        netRevenue,
        refundedOrders,
    } = shopifyData;

    const {
        totalSpend,
        reportedPurchases,
        reportedRevenue,
        reportedRoas,
        campaigns,
    } = metaData;

    // === THE GAP ===
    // Only calculate phantom if ad platforms actually reported data
    const phantomRevenue = reportedRevenue > 0
        ? Math.round(Math.max(0, reportedRevenue - netRevenue) * 100) / 100
        : 0;
    const phantomPct = reportedRevenue > 0
        ? Math.round((phantomRevenue / reportedRevenue) * 1000) / 10
        : 0;

    // True ROAS (based on actual collected revenue)
    const trueRoas = totalSpend > 0
        ? Math.round((netRevenue / totalSpend) * 100) / 100
        : 0;
    const trueCpa = totalOrders > 0
        ? Math.round((totalSpend / totalOrders) * 100) / 100
        : 0;
    const roasOverstatement = Math.round((reportedRoas - trueRoas) * 100) / 100;

    // Purchase count discrepancy
    const phantomPurchases = reportedPurchases - totalOrders;

    // === GAP DECOMPOSITION ===
    const gapFromDiscounts = totalDiscounts;
    const gapFromRefunds = totalRefunds;
    const gapFromDoubleCount = Math.max(0, phantomRevenue - totalDiscounts - totalRefunds - chargebacks);
    const gapFromChargebacks = chargebacks;

    // === CAMPAIGN BREAKDOWN ===
    const discountRatio = reportedRevenue > 0 ? netRevenue / reportedRevenue : 1;

    const campaignBreakdown = campaigns.map(c => {
        const estimatedTrueRevenue = Math.round(c.purchaseValue * discountRatio * 100) / 100;
        const estimatedTrueRoas = c.spend > 0
            ? Math.round((estimatedTrueRevenue / c.spend) * 100) / 100
            : 0;

        const inflationRatio = estimatedTrueRoas > 0
            ? Math.round((c.reportedRoas / estimatedTrueRoas) * 100) / 100
            : 99;

        let flag, flagColor;

        if (estimatedTrueRoas < 1) {
            flag = 'Unprofitable';
            flagColor = 'red';
        } else if (inflationRatio >= 2 && estimatedTrueRoas < 2) {
            flag = 'Likely inflated';
            flagColor = 'red';
        } else if (estimatedTrueRoas >= 5) {
            flag = 'Reasonable';
            flagColor = 'green';
        } else if (inflationRatio >= 2 && estimatedTrueRoas >= 2) {
            flag = 'Inflated but profitable';
            flagColor = 'amber';
        } else if (estimatedTrueRoas < 2) {
            flag = 'Needs verification';
            flagColor = 'amber';
        } else if (inflationRatio >= 1.4) {
            flag = 'Needs verification';
            flagColor = 'amber';
        } else {
            flag = 'Reasonable';
            flagColor = 'green';
        }

        return {
            ...c,
            estimatedTrueRevenue,
            estimatedTrueRoas,
            inflationRatio,
            flag,
            flagColor,
        };
    });

    // === BUSINESS IMPACT ===
    const annualizedPhantom = Math.round(phantomRevenue * 12);
    const budgetAtRisk = Math.round(totalSpend * (phantomPct / 100));

    // === 3-WAY RECONCILIATION (when GA4 data available) ===
    let ga4Reconciliation = null;
    if (ga4Data) {
        const ga4Revenue = ga4Data.totalRevenue;
        const ga4Transactions = ga4Data.totalTransactions;

        // GA4 Agreement Score: how closely does GA4 match Shopify?
        const ga4ShopifyGap = Math.abs(ga4Revenue - netRevenue);
        const ga4AgreementPct = netRevenue > 0
            ? Math.round((1 - ga4ShopifyGap / netRevenue) * 1000) / 10
            : 0;

        // GA4 vs Ad Platform gap
        const ga4AdGap = reportedRevenue - ga4Revenue;
        const ga4AdGapPct = reportedRevenue > 0
            ? Math.round((ga4AdGap / reportedRevenue) * 1000) / 10
            : 0;

        // Per-channel comparison
        const channelComparison = [];
        const channelData = ga4Data.channelData || {};

        if (channelData.meta) {
            const metaCampaigns = campaigns.filter(c => (c.channel || '').toLowerCase().includes('meta') || (c.channel || '').toLowerCase().includes('facebook'));
            const metaReportedRev = metaCampaigns.reduce((s, c) => s + (c.purchaseValue || 0), 0);
            channelComparison.push({
                channel: 'Meta',
                ga4Revenue: channelData.meta.revenue,
                adPlatformRevenue: metaReportedRev,
                shopifyShare: netRevenue > 0 ? Math.round(channelData.meta.revenue / netRevenue * 1000) / 10 : 0,
                inflationVsGA4: channelData.meta.revenue > 0 ? Math.round((metaReportedRev / channelData.meta.revenue) * 100) / 100 : 0,
            });
        }
        if (channelData.google) {
            const googleCampaigns = campaigns.filter(c => (c.channel || '').toLowerCase().includes('google'));
            const googleReportedRev = googleCampaigns.reduce((s, c) => s + (c.purchaseValue || 0), 0);
            channelComparison.push({
                channel: 'Google',
                ga4Revenue: channelData.google.revenue,
                adPlatformRevenue: googleReportedRev,
                shopifyShare: netRevenue > 0 ? Math.round(channelData.google.revenue / netRevenue * 1000) / 10 : 0,
                inflationVsGA4: channelData.google.revenue > 0 ? Math.round((googleReportedRev / channelData.google.revenue) * 100) / 100 : 0,
            });
        }
        if (channelData.tiktok) {
            const tiktokCampaigns = campaigns.filter(c => (c.channel || '').toLowerCase().includes('tiktok'));
            const tiktokReportedRev = tiktokCampaigns.reduce((s, c) => s + (c.purchaseValue || 0), 0);
            channelComparison.push({
                channel: 'TikTok',
                ga4Revenue: channelData.tiktok.revenue,
                adPlatformRevenue: tiktokReportedRev,
                shopifyShare: netRevenue > 0 ? Math.round(channelData.tiktok.revenue / netRevenue * 1000) / 10 : 0,
                inflationVsGA4: channelData.tiktok.revenue > 0 ? Math.round((tiktokReportedRev / channelData.tiktok.revenue) * 100) / 100 : 0,
            });
        }

        // Trust ranking
        const trustRanking = [
            { source: 'Shopify', revenue: netRevenue, label: '💰 Source of truth (actual bank deposits)' },
            { source: 'GA4', revenue: ga4Revenue, label: `📊 ${ga4AgreementPct}% agreement with Shopify` },
            { source: 'Ad Platforms', revenue: reportedRevenue, label: `📢 ${phantomPct}% overstated vs Shopify` },
        ];

        ga4Reconciliation = {
            ga4Revenue,
            ga4Transactions,
            ga4Sessions: ga4Data.totalSessions,
            ga4AgreementPct: Math.max(0, ga4AgreementPct),
            ga4ShopifyGap,
            ga4AdGap,
            ga4AdGapPct,
            channelComparison,
            trustRanking,
            channelData,
        };
    }

    return {
        // KPIs
        metaReportedRevenue: reportedRevenue,
        shopifyNetRevenue: netRevenue,
        phantomRevenue,
        phantomPct,
        reportedRoas,
        trueRoas,
        roasOverstatement,
        totalSpend,
        reportedPurchases,
        actualOrders: totalOrders,
        phantomPurchases,
        trueCpa,

        // Shopify breakdown
        grossRevenue,
        totalDiscounts,
        totalRefunds,
        chargebacks,

        // Gap decomposition
        gapDecomposition: [
            { label: 'Discount codes', value: gapFromDiscounts, pct: reportedRevenue > 0 ? Math.round(gapFromDiscounts / reportedRevenue * 1000) / 10 : 0 },
            { label: 'Refunds & returns', value: gapFromRefunds, pct: reportedRevenue > 0 ? Math.round(gapFromRefunds / reportedRevenue * 1000) / 10 : 0 },
            { label: 'Chargebacks', value: gapFromChargebacks, pct: reportedRevenue > 0 ? Math.round(gapFromChargebacks / reportedRevenue * 1000) / 10 : 0 },
            { label: 'Platform Overlap (Estimated)', value: gapFromDoubleCount, pct: reportedRevenue > 0 ? Math.round(gapFromDoubleCount / reportedRevenue * 1000) / 10 : 0 },
        ],

        // Campaign breakdown
        campaigns: campaignBreakdown,

        // Business impact
        annualizedPhantom,
        budgetAtRisk,

        // 3-way GA4 reconciliation (null if no GA4 data)
        ga4: ga4Reconciliation,
    };
}

module.exports = { reconcile };
