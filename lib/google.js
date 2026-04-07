// lib/google.js
// Google Ads API integration — fetches campaign metrics via GoogleAdsService.SearchStream

const axios = require('axios');

/**
 * Refresh OAuth2 access token using a stored refresh token
 */
async function refreshGoogleAccessToken(clientId, clientSecret, refreshToken) {
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });
    const res = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
    });

    return res.data.access_token;
}

/**
 * Fetch campaign insights from Google Ads API via SearchStream
 *
 * @param {Object} credentials - { developerToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId }
 * @param {string} dateFrom - "2024-01-01"
 * @param {string} dateTo - "2024-01-31"
 * @returns {Array} campaign data
 */
async function fetchGoogleCampaigns(credentials, dateFrom, dateTo) {
    const {
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
        customerId,
        loginCustomerId,
    } = credentials;

    // Get fresh access token from refresh token
    const accessToken = await refreshGoogleAccessToken(clientId, clientSecret, refreshToken);

    const cleanCustomerId = customerId.replace(/-/g, '');
    const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v18';
    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${cleanCustomerId}/googleAds:searchStream`;

    const query = `
        SELECT
            campaign.name,
            campaign.id,
            campaign.status,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.impressions,
            metrics.clicks
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
            AND campaign.status != 'REMOVED'
    `;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
    };

    if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
    }

    const response = await axios.post(url, { query }, { headers, timeout: 30000 });

    // SearchStream returns an array of result batches
    const results = response.data;
    const campaigns = [];
    const batches = Array.isArray(results) ? results : [results];

    for (const batch of batches) {
        const rows = batch.results || [];
        for (const row of rows) {
            const campaign = row.campaign || {};
            const metrics = row.metrics || {};

            const spend = parseInt(metrics.costMicros || '0') / 1_000_000;
            const purchaseValue = parseFloat(metrics.conversionsValue || '0');
            const purchases = Math.round(parseFloat(metrics.conversions || '0'));

            campaigns.push({
                campaignName: campaign.name || 'Unknown Campaign',
                campaignId: campaign.id,
                spend: Math.round(spend * 100) / 100,
                impressions: parseInt(metrics.impressions || '0'),
                clicks: parseInt(metrics.clicks || '0'),
                purchases,
                purchaseValue: Math.round(purchaseValue * 100) / 100,
                reportedRoas: spend > 0 ? Math.round((purchaseValue / spend) * 100) / 100 : 0,
            });
        }
    }

    return campaigns;
}

/**
 * Aggregate Google campaign data into totals (same shape as Meta/TikTok)
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

module.exports = { fetchGoogleCampaigns, processGoogleCampaigns, refreshGoogleAccessToken };
