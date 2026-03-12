// lib/klaviyo.js
// Klaviyo API integration — pull email/SMS attributed revenue
// Compare Klaviyo-claimed revenue vs Shopify reality

/**
 * Fetch Klaviyo revenue metrics for a date range
 * Uses Klaviyo Reporting API v2024-10-15
 */
async function fetchKlaviyoRevenue(apiKey, dateFrom, dateTo) {
    // Fetch flows (automated emails/SMS) performance
    const flowsRes = await fetch('https://a.klaviyo.com/api/reporting/flows/values/', {
        method: 'POST',
        headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-10-15',
        },
        body: JSON.stringify({
            data: {
                type: 'reporting-flows-values',
                attributes: {
                    statistics: ['revenue', 'unique_conversions', 'unique_recipients'],
                    timeframe: { key: 'custom', start: dateFrom, end: dateTo },
                    conversion_metric_id: 'placed_order',
                },
            },
        }),
    });

    // Fetch campaigns performance
    const campaignsRes = await fetch('https://a.klaviyo.com/api/reporting/campaigns/values/', {
        method: 'POST',
        headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-10-15',
        },
        body: JSON.stringify({
            data: {
                type: 'reporting-campaigns-values',
                attributes: {
                    statistics: ['revenue', 'unique_conversions', 'unique_recipients'],
                    timeframe: { key: 'custom', start: dateFrom, end: dateTo },
                    conversion_metric_id: 'placed_order',
                },
            },
        }),
    });

    let flowRevenue = 0, flowConversions = 0;
    let campaignRevenue = 0, campaignConversions = 0;

    try {
        const flowsData = await flowsRes.json();
        for (const result of flowsData?.data?.attributes?.results || []) {
            const stats = result.statistics || {};
            flowRevenue += stats.revenue || 0;
            flowConversions += stats.unique_conversions || 0;
        }
    } catch (e) {
        console.warn('Klaviyo flows fetch failed:', e.message);
    }

    try {
        const campaignsData = await campaignsRes.json();
        for (const result of campaignsData?.data?.attributes?.results || []) {
            const stats = result.statistics || {};
            campaignRevenue += stats.revenue || 0;
            campaignConversions += stats.unique_conversions || 0;
        }
    } catch (e) {
        console.warn('Klaviyo campaigns fetch failed:', e.message);
    }

    const totalClaimedRevenue = Math.round((flowRevenue + campaignRevenue) * 100) / 100;
    const totalConversions = flowConversions + campaignConversions;

    return {
        totalClaimedRevenue,
        totalConversions,
        flows: {
            revenue: Math.round(flowRevenue * 100) / 100,
            conversions: flowConversions,
        },
        campaigns: {
            revenue: Math.round(campaignRevenue * 100) / 100,
            conversions: campaignConversions,
        },
    };
}

/**
 * Compare Klaviyo claimed revenue vs Shopify (same phantom revenue concept)
 */
function reconcileKlaviyo(klaviyoData, shopifyNetRevenue) {
    const klaviyoPhantom = Math.round((klaviyoData.totalClaimedRevenue - shopifyNetRevenue) * 100) / 100;
    const overlapPct = shopifyNetRevenue > 0
        ? Math.round((klaviyoData.totalClaimedRevenue / shopifyNetRevenue) * 1000) / 10
        : 0;

    return {
        ...klaviyoData,
        overlapPct,        // e.g. 145% means Klaviyo claims 145% of Shopify revenue
        phantomRevenue: Math.max(0, klaviyoPhantom),
        isOverClaiming: overlapPct > 100,
        verdict: overlapPct > 150 ? 'Severe overclaiming — Klaviyo likely double-counting'
            : overlapPct > 120 ? 'Moderate overclaiming — review attribution windows'
                : overlapPct > 100 ? 'Slight overclaiming — normal attribution overlap'
                    : 'Under-attributing — Klaviyo tracking may be incomplete',
    };
}

/**
 * Generate sample Klaviyo data for demo mode
 */
function generateSampleKlaviyoData() {
    return {
        totalClaimedRevenue: 52400,
        totalConversions: 342,
        flows: {
            revenue: 38200,
            conversions: 248,
        },
        campaigns: {
            revenue: 14200,
            conversions: 94,
        },
    };
}

module.exports = { fetchKlaviyoRevenue, reconcileKlaviyo, generateSampleKlaviyoData };
