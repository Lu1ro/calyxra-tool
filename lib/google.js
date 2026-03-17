// lib/google.js
// Google Ads API integration
// TODO: Google Ads requires proper OAuth2 flow with separate:
//   - OAuth2 access token (Authorization: Bearer)
//   - Developer token (developer-token header)
//   - Login customer ID for MCC accounts (login-customer-id header)
// This needs to be implemented properly before enabling.
// For now, returns empty data to avoid blocking reconciliation.

/**
 * Fetch campaign insights from Google Ads API
 * 
 * DISABLED: Returns empty array until OAuth2 flow is properly implemented.
 * Google Ads API requires 3 separate credentials that we currently conflate.
 */
async function fetchGoogleCampaigns(developerToken, customerId, dateFrom, dateTo) {
    console.warn('[GOOGLE ADS] Integration disabled — OAuth2 flow not yet implemented. Returning empty dataset.');
    return [];
}

/**
 * Aggregate Google campaign data into totals (same shape as Meta)
 */
function processGoogleCampaigns(campaigns) {
    return {
        totalSpend: 0,
        reportedPurchases: 0,
        reportedRevenue: 0,
        reportedRoas: 0,
        campaigns: [],
    };
}

module.exports = { fetchGoogleCampaigns, processGoogleCampaigns };
