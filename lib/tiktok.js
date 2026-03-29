// lib/tiktok.js
// Fetches campaign data from the TikTok Marketing API

const axios = require('axios');

/**
 * Fetch campaign report from TikTok Ads API
 * @param {string} accessToken - TikTok Ads access token
 * @param {string} advertiserId - TikTok advertiser ID
 * @param {string} dateFrom - "2024-01-01"
 * @param {string} dateTo - "2024-01-31"
 * @returns {Array} campaign data
 */
async function fetchTikTokCampaigns(accessToken, advertiserId, dateFrom, dateTo) {
    const url = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/';

    const params = {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id']),
        metrics: JSON.stringify([
            'campaign_name',
            'spend',
            'impressions',
            'clicks',
            'conversion',
            'total_purchase_value',
        ]),
        start_date: dateFrom,
        end_date: dateTo,
        page_size: 200,
        page: 1,
    };

    const response = await axios.get(url, {
        params,
        headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
        },
    });

    const responseData = response.data;

    if (responseData.code !== 0) {
        throw new Error(`TikTok API error: ${responseData.message || 'Unknown error'} (code: ${responseData.code})`);
    }

    const rows = responseData.data?.list || [];

    return rows.map(row => {
        const metrics = row.metrics || {};

        const spend = parseFloat(metrics.spend || '0');
        const purchaseValue = parseFloat(metrics.total_purchase_value || '0');

        return {
            campaignName: metrics.campaign_name || 'Unknown Campaign',
            spend,
            impressions: parseInt(metrics.impressions || '0'),
            clicks: parseInt(metrics.clicks || '0'),
            purchases: parseInt(metrics.conversion || '0'),
            purchaseValue,
            reportedRoas: spend > 0 ? Math.round((purchaseValue / spend) * 100) / 100 : 0,
        };
    });
}

/**
 * Aggregate TikTok campaign data into totals (same shape as Meta/Google)
 */
function processTikTokCampaigns(campaigns) {
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
            channel: 'TikTok',
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

module.exports = { fetchTikTokCampaigns, processTikTokCampaigns };
