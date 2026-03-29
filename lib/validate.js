// lib/validate.js
// Validate API credentials by making a lightweight test call to each platform

const axios = require('axios');

/**
 * Validate Shopify Admin API token
 * Makes a lightweight call to GET /admin/api/2024-01/shop.json
 */
async function validateShopify(domain, apiKey) {
    if (!apiKey || !apiKey.trim()) throw new Error('Shopify Access Token is required');
    if (!domain || !domain.trim()) throw new Error('Shopify domain is required');

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanDomain}/admin/api/2024-01/shop.json`;

    try {
        const res = await axios.get(url, {
            headers: { 'X-Shopify-Access-Token': apiKey.trim() },
            timeout: 10000,
        });
        return { valid: true, shopName: res.data.shop?.name || cleanDomain };
    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error('Invalid Shopify token. Make sure it starts with shpat_ and has read_orders scope.');
        }
        if (err.response?.status === 404) {
            throw new Error(`Store "${cleanDomain}" not found. Check the domain.`);
        }
        throw new Error(`Shopify connection failed: ${err.message}`);
    }
}

/**
 * Validate Meta Ads API credentials
 * Makes a lightweight call to GET /v21.0/{act_id}?fields=name
 */
async function validateMeta(accessToken, adAccountId) {
    if (!accessToken || !accessToken.trim()) throw new Error('Meta Access Token is required');
    if (!adAccountId || !adAccountId.trim()) throw new Error('Ad Account ID is required');

    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    try {
        const res = await axios.get(`https://graph.facebook.com/v21.0/${accountId}`, {
            params: { access_token: accessToken.trim(), fields: 'name,account_status' },
            timeout: 10000,
        });
        return { valid: true, accountName: res.data.name || accountId };
    } catch (err) {
        const fbError = err.response?.data?.error;
        if (fbError?.code === 190) {
            throw new Error('Invalid or expired Meta token. Generate a new one at developers.facebook.com/tools/explorer');
        }
        if (fbError?.code === 100) {
            throw new Error(`Ad Account "${adAccountId}" not found. Make sure the ID is correct (format: act_123456789).`);
        }
        throw new Error(`Meta connection failed: ${fbError?.message || err.message}`);
    }
}

/**
 * Validate Google Ads API credentials
 * Makes a lightweight GAQL query
 */
async function validateGoogle(developerToken, customerId, clientId, clientSecret, refreshToken, loginCustomerId) {
    if (!developerToken || !developerToken.trim()) throw new Error('Google Ads Developer Token is required');
    if (!customerId || !customerId.trim()) throw new Error('Google Ads Customer ID is required');
    if (!clientId || !clientId.trim()) throw new Error('OAuth2 Client ID is required');
    if (!clientSecret || !clientSecret.trim()) throw new Error('OAuth2 Client Secret is required');
    if (!refreshToken || !refreshToken.trim()) throw new Error('OAuth2 Refresh Token is required');

    // Step 1: Exchange refresh token for access token
    let accessToken;
    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
            refresh_token: refreshToken.trim(),
            grant_type: 'refresh_token',
        }, { timeout: 10000 });
        accessToken = tokenRes.data.access_token;
    } catch (err) {
        const msg = err.response?.data?.error_description || err.message;
        throw new Error(`OAuth2 token refresh failed: ${msg}. Check Client ID, Client Secret, and Refresh Token.`);
    }

    // Step 2: Test API call with the fresh access token
    const cleanCustomerId = customerId.replace(/-/g, '');
    const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v18';
    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${cleanCustomerId}/googleAds:searchStream`;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken.trim(),
        'Content-Type': 'application/json',
    };
    if (loginCustomerId && loginCustomerId.trim()) {
        headers['login-customer-id'] = loginCustomerId.replace(/-/g, '').trim();
    }

    try {
        await axios.post(url,
            { query: 'SELECT customer.id FROM customer LIMIT 1' },
            { headers, timeout: 10000 }
        );
        return { valid: true };
    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error('Google Ads API authentication failed. Check your Developer Token.');
        }
        if (err.response?.status === 403) {
            throw new Error('Google Ads API access denied. Your Developer Token may not have Basic Access yet, or the Customer ID is wrong.');
        }
        const detail = err.response?.data?.error?.message || err.message;
        throw new Error(`Google Ads connection failed: ${detail}`);
    }
}

/**
 * Validate TikTok Ads API credentials
 * Makes a lightweight call to GET /advertiser/info/
 */
async function validateTikTok(accessToken, advertiserId) {
    if (!accessToken || !accessToken.trim()) throw new Error('TikTok Access Token is required');
    if (!advertiserId || !advertiserId.trim()) throw new Error('Advertiser ID is required');

    try {
        const res = await axios.get('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/', {
            params: { advertiser_ids: JSON.stringify([advertiserId.trim()]) },
            headers: {
                'Access-Token': accessToken.trim(),
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });

        if (res.data.code !== 0) {
            throw new Error(`TikTok API error: ${res.data.message} (code ${res.data.code})`);
        }
        return { valid: true };
    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error('Invalid TikTok token. Generate a new one at ads.tiktok.com/marketing_api.');
        }
        throw new Error(`TikTok connection failed: ${err.message}`);
    }
}

module.exports = { validateShopify, validateMeta, validateGoogle, validateTikTok };
