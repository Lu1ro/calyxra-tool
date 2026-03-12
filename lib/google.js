// lib/google.js
// Fetches campaign data from the Google Ads API (REST/GAQL)

const axios = require('axios');

/**
 * Fetch campaign insights from Google Ads API using GAQL
 * Requires: Developer Token, Customer ID, and OAuth2 Access Token
 * 
 * NOTE: Google Ads API requires OAuth2 for production use.
 * For MVP, the "developerToken" field actually accepts a refresh token
 * that we exchange for an access token, OR a direct OAuth Bearer token.
 * 
 * @param {string} developerToken - Google Ads developer token
 * @param {string} customerId - Google Ads customer ID (e.g. "123-456-7890")
 * @param {string} oauthToken - OAuth2 Bearer access token
 * @param {string} dateFrom - "2024-01-01"
 * @param {string} dateTo - "2024-01-31"
 * @returns {Array} campaign data
 */
async function fetchGoogleCampaigns(developerToken, customerId, dateFrom, dateTo) {
    // Normalize customer ID — remove dashes
    const cleanCustomerId = customerId.replace(/-/g, '');

    // Build GAQL query for campaign performance
    const query = `
        SELECT
            campaign.name,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
    `;

    const url = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:searchStream`;

    const response = await axios.post(url, { query }, {
        headers: {
            'Authorization': `Bearer ${developerToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
        },
    });

    // Google Ads searchStream returns an array of result batches
    const results = [];
    const batches = response.data || [];

    for (const batch of batches) {
        for (const row of (batch.results || [])) {
            const campaign = row.campaign || {};
            const metrics = row.metrics || {};

            // cost_micros is in micros (1/1,000,000 of the currency)
            const spend = (parseInt(metrics.costMicros || '0') / 1_000_000);

            results.push({
                campaignName: campaign.name || 'Unknown Campaign',
                spend: Math.round(spend * 100) / 100,
                impressions: parseInt(metrics.impressions || '0'),
                clicks: parseInt(metrics.clicks || '0'),
                purchases: Math.round(parseFloat(metrics.conversions || '0')),
                purchaseValue: Math.round(parseFloat(metrics.conversionsValue || '0') * 100) / 100,
            });
        }
    }

    return results;
}

/**
 * Aggregate Google campaign data into totals (same shape as Meta)
 */
function processGoogleCampaigns(campaigns) {
    const totals = {
        totalSpend: 0,
        reportedPurchases: 0,
        reportedRevenue: 0,
        campaigns: [],
    };

    for (const campaign of campaigns) {
        totals.totalSpend += campaign.spend;
        totals.reportedPurchases += campaign.purchases;
        totals.reportedRevenue += campaign.purchaseValue;

        totals.campaigns.push({
            ...campaign,
            channel: 'Google',
            reportedRoas: campaign.spend > 0
                ? Math.round((campaign.purchaseValue / campaign.spend) * 100) / 100
                : 0,
        });
    }

    totals.totalSpend = Math.round(totals.totalSpend * 100) / 100;
    totals.reportedRevenue = Math.round(totals.reportedRevenue * 100) / 100;
    totals.reportedRoas = totals.totalSpend > 0
        ? Math.round((totals.reportedRevenue / totals.totalSpend) * 100) / 100
        : 0;

    totals.campaigns.sort((a, b) => b.reportedRoas - a.reportedRoas);

    return totals;
}

module.exports = { fetchGoogleCampaigns, processGoogleCampaigns };
