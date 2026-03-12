// lib/ga4.js
// Google Analytics 4 Data API — fetch revenue, sessions, and transactions by source/medium
// Uses the GA4 Data API (analyticsdata.googleapis.com) with OAuth2 tokens from Google OAuth

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('GA4 token refresh failed: ' + JSON.stringify(data));
    return data.access_token;
}

/**
 * List GA4 properties accessible to this account
 */
async function listGA4Properties(accessToken) {
    const res = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();

    const properties = [];
    for (const account of data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
            properties.push({
                propertyId: prop.property?.replace('properties/', ''),
                displayName: prop.displayName,
                accountName: account.displayName,
            });
        }
    }
    return properties;
}

/**
 * Fetch GA4 revenue data by source/medium for a date range
 * Returns: { totalRevenue, totalTransactions, totalSessions, bySource: [...] }
 */
async function fetchGA4Data(accessToken, propertyId, dateFrom, dateTo) {
    const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
                dimensions: [
                    { name: 'sessionSourceMedium' },
                ],
                metrics: [
                    { name: 'purchaseRevenue' },
                    { name: 'transactions' },
                    { name: 'sessions' },
                    { name: 'totalRevenue' },
                ],
            }),
        }
    );

    const data = await res.json();

    if (data.error) {
        throw new Error(`GA4 API error: ${data.error.message}`);
    }

    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalSessions = 0;
    const bySource = [];

    for (const row of data.rows || []) {
        const source = row.dimensionValues?.[0]?.value || '(unknown)';
        const purchaseRevenue = parseFloat(row.metricValues?.[0]?.value || 0);
        const transactions = parseInt(row.metricValues?.[1]?.value || 0);
        const sessions = parseInt(row.metricValues?.[2]?.value || 0);
        const revenue = parseFloat(row.metricValues?.[3]?.value || 0);

        totalRevenue += revenue;
        totalTransactions += transactions;
        totalSessions += sessions;

        bySource.push({
            source,
            purchaseRevenue,
            transactions,
            sessions,
            revenue,
        });
    }

    // Classify channels 
    const channelData = classifyChannels(bySource);

    return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        totalSessions,
        bySource,
        channelData,
    };
}

/**
 * Classify GA4 source/medium into ad platform channels
 * This maps GA4 traffic sources to the same channels as the ad platforms
 */
function classifyChannels(bySource) {
    const channels = {
        meta: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
        google: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
        tiktok: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
        organic: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
        direct: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
        other: { revenue: 0, transactions: 0, sessions: 0, sources: [] },
    };

    for (const row of bySource) {
        const src = row.source.toLowerCase();
        let channel;

        if (src.includes('facebook') || src.includes('instagram') || src.includes('fb') || src.includes('meta')) {
            channel = 'meta';
        } else if (src.includes('google') && (src.includes('cpc') || src.includes('ppc') || src.includes('paid'))) {
            channel = 'google';
        } else if (src.includes('tiktok')) {
            channel = 'tiktok';
        } else if (src.includes('organic') || src.includes('seo')) {
            channel = 'organic';
        } else if (src === '(direct) / (none)' || src === '(not set)') {
            channel = 'direct';
        } else {
            channel = 'other';
        }

        channels[channel].revenue += row.purchaseRevenue;
        channels[channel].transactions += row.transactions;
        channels[channel].sessions += row.sessions;
        channels[channel].sources.push(row.source);
    }

    // Round the values
    for (const key of Object.keys(channels)) {
        channels[key].revenue = Math.round(channels[key].revenue * 100) / 100;
    }

    return channels;
}

/**
 * Generate sample GA4 data for demo mode
 */
function generateSampleGA4Data() {
    return {
        totalRevenue: 198450,
        totalTransactions: 1247,
        totalSessions: 48320,
        bySource: [
            { source: 'facebook / cpc', purchaseRevenue: 82400, transactions: 520, sessions: 15200, revenue: 82400 },
            { source: 'google / cpc', purchaseRevenue: 45200, transactions: 285, sessions: 12800, revenue: 45200 },
            { source: 'instagram / cpc', purchaseRevenue: 28600, transactions: 180, sessions: 8400, revenue: 28600 },
            { source: 'tiktok / cpc', purchaseRevenue: 12300, transactions: 78, sessions: 3200, revenue: 12300 },
            { source: 'google / organic', purchaseRevenue: 18500, transactions: 112, sessions: 5600, revenue: 18500 },
            { source: '(direct) / (none)', purchaseRevenue: 8200, transactions: 52, sessions: 2400, revenue: 8200 },
            { source: 'email / newsletter', purchaseRevenue: 3250, transactions: 20, sessions: 720, revenue: 3250 },
        ],
        channelData: {
            meta: { revenue: 111000, transactions: 700, sessions: 23600, sources: ['facebook / cpc', 'instagram / cpc'] },
            google: { revenue: 45200, transactions: 285, sessions: 12800, sources: ['google / cpc'] },
            tiktok: { revenue: 12300, transactions: 78, sessions: 3200, sources: ['tiktok / cpc'] },
            organic: { revenue: 18500, transactions: 112, sessions: 5600, sources: ['google / organic'] },
            direct: { revenue: 8200, transactions: 52, sessions: 2400, sources: ['(direct) / (none)'] },
            other: { revenue: 3250, transactions: 20, sessions: 720, sources: ['email / newsletter'] },
        },
    };
}

module.exports = { fetchGA4Data, listGA4Properties, refreshAccessToken, generateSampleGA4Data };
