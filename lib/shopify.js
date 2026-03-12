// lib/shopify.js
// Fetches real orders from the Shopify Admin REST API

const axios = require('axios');

/**
 * Fetch orders from Shopify for a given date range
 * @param {string} storeDomain - e.g. "my-store.myshopify.com"
 * @param {string} apiKey - Shopify Admin API access token
 * @param {string} dateFrom - ISO date string "2024-01-01"
 * @param {string} dateTo   - ISO date string "2024-01-31"
 * @returns {Array} array of order objects
 */
async function fetchShopifyOrders(storeDomain, apiKey, dateFrom, dateTo) {
    const baseUrl = `https://${storeDomain}/admin/api/2024-01/orders.json`;

    let allOrders = [];
    let pageInfo = null;

    do {
        const params = {
            status: 'any',
            limit: 250,
            created_at_min: new Date(dateFrom).toISOString(),
            created_at_max: new Date(dateTo + 'T23:59:59').toISOString(),
            fields: 'id,name,email,financial_status,created_at,total_price,subtotal_price,total_discounts,total_tax,total_shipping_price_set,discount_codes,refunds,cancelled_at,currency',
        };

        if (pageInfo) {
            params.page_info = pageInfo;
            delete params.created_at_min;
            delete params.created_at_max;
        }

        const response = await axios.get(baseUrl, {
            headers: {
                'X-Shopify-Access-Token': apiKey,
                'Content-Type': 'application/json',
            },
            params,
        });

        allOrders = allOrders.concat(response.data.orders);

        // Handle pagination
        const linkHeader = response.headers['link'];
        if (linkHeader && linkHeader.includes('rel="next"')) {
            const match = linkHeader.match(/page_info=([^&>]+).*rel="next"/);
            pageInfo = match ? match[1] : null;
        } else {
            pageInfo = null;
        }
    } while (pageInfo);

    return allOrders;
}

/**
 * Process raw Shopify orders into reconciliation metrics
 */
function processShopifyOrders(orders) {
    let totalOrders = 0;
    let grossRevenue = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let refundedOrders = 0;
    let chargebacks = 0;

    for (const order of orders) {
        if (order.cancelled_at) continue; // Skip fully cancelled

        totalOrders++;
        const orderTotal = parseFloat(order.total_price) || 0;
        const discountTotal = parseFloat(order.total_discounts) || 0;

        grossRevenue += orderTotal;
        totalDiscounts += discountTotal;

        // Calculate refunds
        if (order.refunds && order.refunds.length > 0) {
            let orderRefundTotal = 0;
            for (const refund of order.refunds) {
                for (const transaction of (refund.transactions || [])) {
                    if (transaction.kind === 'refund' && transaction.status === 'success') {
                        orderRefundTotal += parseFloat(transaction.amount) || 0;
                    }
                }
            }
            totalRefunds += orderRefundTotal;
            if (order.financial_status === 'refunded') refundedOrders++;
        }
    }

    const netRevenue = grossRevenue - totalRefunds;

    return {
        totalOrders,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        chargebacks: Math.round(chargebacks * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        refundedOrders,
    };
}

module.exports = { fetchShopifyOrders, processShopifyOrders };
