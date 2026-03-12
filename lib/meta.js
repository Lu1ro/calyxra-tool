// lib/meta.js
// Fetches campaign data from the Meta Marketing API

const axios = require('axios');

/**
 * Fetch campaign insights from Meta Marketing API
 * @param {string} accessToken - Meta user access token
 * @param {string} adAccountId - e.g. "act_123456789"
 * @param {string} dateFrom - "2024-01-01"
 * @param {string} dateTo - "2024-01-31"
 * @returns {Array} campaign insights
 */
async function fetchMetaCampaigns(accessToken, adAccountId, dateFrom, dateTo) {
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    const url = `https://graph.facebook.com/v18.0/${accountId}/insights`;

    const params = {
        access_token: accessToken,
        level: 'campaign',
        fields: 'campaign_name,spend,impressions,clicks,actions,action_values',
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        limit: 500,
    };

    const response = await axios.get(url, { params });
    const data = response.data.data || [];

    return data.map(campaign => {
        // Extract purchase count and value from actions/action_values
        const purchaseAction = (campaign.actions || []).find(a => a.action_type === 'purchase');
        const purchaseValueAction = (campaign.action_values || []).find(a => a.action_type === 'purchase');

        return {
            campaignName: campaign.campaign_name,
            spend: parseFloat(campaign.spend) || 0,
            impressions: parseInt(campaign.impressions) || 0,
            clicks: parseInt(campaign.clicks) || 0,
            purchases: parseInt(purchaseAction?.value || 0),
            purchaseValue: parseFloat(purchaseValueAction?.value || 0),
        };
    });
}

/**
 * Aggregate campaign data into totals
 */
function processMetaCampaigns(campaigns) {
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

    // Sort campaigns by reported ROAS descending (most inflated first)
    totals.campaigns.sort((a, b) => b.reportedRoas - a.reportedRoas);

    return totals;
}

module.exports = { fetchMetaCampaigns, processMetaCampaigns };
