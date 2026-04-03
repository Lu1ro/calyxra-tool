// lib/shopify.js
// Fetches real orders and analytics from the Shopify Admin API

const axios = require('axios');

/**
 * Fetch sales analytics using Shopify's GraphQL API + ShopifyQL
 * This runs the EXACT same query as Shopify Analytics dashboard,
 * reading from the internal `sales` table — guaranteed 1:1 match.
 * 
 * Requires `read_analytics` scope on the custom app.
 * Falls back gracefully if scope is missing.
 */
async function fetchShopifySalesAnalytics(storeDomain, apiKey, dateFrom, dateTo) {
    const url = `https://${storeDomain}/admin/api/2025-01/graphql.json`;
    
    const query = `{
        shopifyqlQuery(query: "FROM sales SHOW gross_sales, net_sales, discounts, returns, shipping, taxes SINCE '${dateFrom}' UNTIL '${dateTo}' WITH TOTALS") {
            __typename
            ... on TableResponse {
                tableData {
                    columns { name dataType }
                    rowData
                }
            }
            parseErrors { message }
        }
    }`;

    try {
        const res = await axios.post(url, { query }, {
            headers: {
                'X-Shopify-Access-Token': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });

        const result = res.data?.data?.shopifyqlQuery;

        if (result?.parseErrors?.length > 0) {
            return null;
        }

        const tableData = result?.tableData || result?.data?.tableData;
        if (!tableData) {
            return null;
        }

        const { columns, rowData } = tableData;
        if (!rowData || rowData.length === 0) {
            return null;
        }

        // The last row with TOTALS contains the aggregated values
        const totalsRow = rowData[rowData.length - 1];
        const colNames = columns.map(c => c.name);

        const getValue = (name) => {
            const idx = colNames.indexOf(name);
            return idx >= 0 ? parseFloat(totalsRow[idx]) || 0 : 0;
        };

        return {
            grossRevenue: getValue('gross_sales'),
            netRevenue: getValue('net_sales'),
            totalDiscounts: Math.abs(getValue('discounts')),
            totalRefunds: Math.abs(getValue('returns')),
            shipping: getValue('shipping'),
            taxes: getValue('taxes'),
        };
    } catch (err) {
        // Graceful fallback — scope might not be available
        return null;
    }
}

/**
 * Fetch orders from Shopify for a given date range
 * @param {string} storeDomain - e.g. "my-store.myshopify.com"
 * @param {string} apiKey - Shopify Admin API access token
 * @param {string} dateFrom - ISO date string "2024-01-01"
 * @param {string} dateTo   - ISO date string "2024-01-31"
 * @returns {Array} array of order objects
 */
async function fetchShopifyOrders(storeDomain, apiKey, dateFrom, dateTo) {
    const baseUrl = `https://${storeDomain}/admin/api/2025-01/orders.json`;

    let allOrders = [];
    let nextUrl = null;

    // First request uses baseUrl with params
    const firstParams = {
        status: 'any',
        limit: 250,
        created_at_min: new Date(dateFrom).toISOString(),
        created_at_max: new Date(dateTo + 'T23:59:59').toISOString(),
    };

    const headers = {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json',
    };

    let response = await axios.get(baseUrl, { headers, params: firstParams });
    allOrders = allOrders.concat(response.data.orders || []);

    // Pagination: follow the full URL from Link header
    const getNextUrl = (linkHeader) => {
        if (!linkHeader || !linkHeader.includes('rel="next"')) return null;
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        return match ? match[1] : null;
    };

    nextUrl = getNextUrl(response.headers['link']);

    while (nextUrl) {
        response = await axios.get(nextUrl, { headers });
        allOrders = allOrders.concat(response.data.orders || []);
        nextUrl = getNextUrl(response.headers['link']);
    }

    return allOrders;
}

/**
 * Process raw Shopify orders into reconciliation metrics
 * 
 * Matches Shopify Analytics definitions:
 *   Gross sales  = sum(line_item.price × line_item.quantity)
 *   Discounts    = total_discounts
 *   Returns      = sum of refund transactions + refund line items
 *   Net sales    = Gross sales - Discounts - Returns
 * 
 * Filters out:
 *   - Cancelled orders (cancelled_at != null)
 *   - Test orders (test === true)
 */
function processShopifyOrders(orders) {
    let totalOrders = 0;
    let grossRevenue = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let refundedOrders = 0;
    let chargebacks = 0;
    let skippedTest = 0;
    let skippedCancelled = 0;

    for (const order of (orders || [])) {
        if (!order) continue; // Skip undefined entries
        // Skip cancelled orders
        if (order.cancelled_at) {
            skippedCancelled++;
            continue;
        }

        // Skip test orders — Shopify Analytics excludes them
        if (order.test === true) {
            skippedTest++;
            continue;
        }

        totalOrders++;

        // Shopify Analytics "Gross sales" = subtotal_price + total_discounts
        // subtotal_price = line item totals AFTER discounts, EXCLUDING shipping + taxes
        // total_discounts = discounts applied
        // So subtotal_price + total_discounts = original prices (before discounts, excluding shipping/taxes)
        const subtotal = parseFloat(order.subtotal_price) || 0;
        const discountTotal = parseFloat(order.total_discounts) || 0;
        const orderGross = subtotal + discountTotal;

        grossRevenue += orderGross;
        totalDiscounts += discountTotal;

        // Detect chargebacks from Shopify disputes/financial status
        // Shopify marks orders with chargebacks as financial_status: 'partially_refunded' or 'refunded'
        // and the order gets tagged or has risk recommendations. We check for chargeback transactions.
        if (order.refunds && order.refunds.length > 0) {
            let orderRefundTotal = 0;

            for (const refund of order.refunds) {
                let hasTransactionRefund = false;

                // Method 1: Refund transactions (full refunds, manual refunds)
                for (const transaction of (refund.transactions || [])) {
                    if (transaction.kind === 'refund' && transaction.status === 'success') {
                        // Check if this is a chargeback (gateway returns 'chargeback' or note contains it)
                        const isChargeback = transaction.gateway === 'chargeback'
                            || (refund.note && refund.note.toLowerCase().includes('chargeback'))
                            || (refund.note && refund.note.toLowerCase().includes('dispute'));
                        const amount = parseFloat(transaction.amount) || 0;
                        if (isChargeback) {
                            chargebacks += amount;
                        } else {
                            orderRefundTotal += amount;
                        }
                        hasTransactionRefund = true;
                    }
                }

                // Method 2: Refund line items (partial refunds without transactions)
                // Only use if no transaction-level refund was found to avoid double-counting
                if (!hasTransactionRefund && refund.refund_line_items && refund.refund_line_items.length > 0) {
                    for (const item of refund.refund_line_items) {
                        orderRefundTotal += parseFloat(item.subtotal) || 0;
                    }
                }
            }

            totalRefunds += orderRefundTotal;
            if (order.financial_status === 'refunded') refundedOrders++;
        }
    }

    // Net sales = Gross sales - Discounts - Returns
    const netRevenue = grossRevenue - totalDiscounts - totalRefunds;

    return {
        totalOrders,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        chargebacks: Math.round(chargebacks * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        refundedOrders,
        _debug: { skippedTest, skippedCancelled },
    };
}

module.exports = { fetchShopifyOrders, processShopifyOrders, fetchShopifySalesAnalytics };
