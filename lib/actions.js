// lib/actions.js
// Campaign Action Engine — pause, update budgets, and track actions via Meta/Google APIs
// This is what makes Calyxra actually FIX campaigns, not just report on them

const axios = require('axios');

/**
 * Pause a Meta campaign via Marketing API
 */
async function pauseMetaCampaign(accessToken, campaignId) {
    const url = `https://graph.facebook.com/v21.0/${campaignId}`;
    const res = await axios.post(url, null, {
        params: {
            access_token: accessToken,
            status: 'PAUSED',
        },
    });
    return { success: res.data?.success !== false, campaignId, action: 'PAUSED' };
}

/**
 * Update a Meta campaign's daily budget
 */
async function updateMetaBudget(accessToken, campaignId, newDailyBudget) {
    const url = `https://graph.facebook.com/v21.0/${campaignId}`;
    // Meta API expects budget in cents
    const budgetInCents = Math.round(newDailyBudget * 100);
    const res = await axios.post(url, null, {
        params: {
            access_token: accessToken,
            daily_budget: budgetInCents,
        },
    });
    return { success: res.data?.success !== false, campaignId, action: 'BUDGET_UPDATED', newBudget: newDailyBudget };
}

/**
 * Resume a paused Meta campaign
 */
async function resumeMetaCampaign(accessToken, campaignId) {
    const url = `https://graph.facebook.com/v21.0/${campaignId}`;
    const res = await axios.post(url, null, {
        params: {
            access_token: accessToken,
            status: 'ACTIVE',
        },
    });
    return { success: res.data?.success !== false, campaignId, action: 'RESUMED' };
}

/**
 * Pause a Google Ads campaign via Google Ads API
 */
async function pauseGoogleCampaign(accessToken, customerId, campaignId) {
    const url = `https://googleads.googleapis.com/v16/customers/${customerId}/campaigns/${campaignId}`;
    const res = await axios.patch(url, {
        status: 'PAUSED',
    }, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
        },
    });
    return { success: true, campaignId, action: 'PAUSED' };
}

/**
 * Execute a batch of recommended actions
 * In demo mode, simulates the actions without actually calling APIs
 */
async function executeActions(actions, credentials, isDemo = false) {
    const results = [];

    for (const action of actions) {
        if (action.action === 'MAINTAIN') continue; // no action needed

        if (isDemo) {
            // Simulate action in demo mode
            results.push({
                campaignName: action.campaignName,
                channel: action.channel,
                action: action.action,
                status: 'simulated',
                message: `[DEMO] Would ${action.action.toLowerCase()} "${action.campaignName}" — ${action.reason}`,
                timestamp: new Date().toISOString(),
            });
            continue;
        }

        try {
            let result;
            if (action.channel === 'Meta' || action.channel === 'meta') {
                const token = credentials.meta?.accessToken;
                if (!token) throw new Error('No Meta access token');

                if (action.action === 'PAUSE') {
                    result = await pauseMetaCampaign(token, action.campaignId);
                } else if (action.action === 'REDUCE' || action.action === 'SCALE') {
                    result = await updateMetaBudget(token, action.campaignId, action.recommendedSpend / 30); // monthly → daily
                }
            } else if (action.channel === 'Google' || action.channel === 'google') {
                const token = credentials.google?.accessToken;
                const customerId = credentials.google?.customerId;
                if (!token) throw new Error('No Google access token');

                if (action.action === 'PAUSE') {
                    result = await pauseGoogleCampaign(token, customerId, action.campaignId);
                }
            }

            results.push({
                campaignName: action.campaignName,
                channel: action.channel,
                action: action.action,
                status: 'executed',
                message: `✅ ${action.action} "${action.campaignName}" successfully`,
                result,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            results.push({
                campaignName: action.campaignName,
                channel: action.channel,
                action: action.action,
                status: 'failed',
                message: `❌ Failed to ${action.action.toLowerCase()} "${action.campaignName}": ${error.message}`,
                error: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    }

    return results;
}

module.exports = { pauseMetaCampaign, updateMetaBudget, resumeMetaCampaign, pauseGoogleCampaign, executeActions };
