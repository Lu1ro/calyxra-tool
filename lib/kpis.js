// lib/kpis.js
// Custom KPI computation engine — calculates MER, Net Profit, CAC, and custom metrics

/**
 * Default KPI definitions available to all tiers
 */
const DEFAULT_KPIS = [
    {
        key: 'mer',
        label: 'MER',
        fullName: 'Marketing Efficiency Ratio',
        formula: 'revenue / spend',
        description: 'Total revenue divided by total ad spend. Higher is better.',
        compute: (data) => data.totalSpend > 0
            ? Math.round((data.shopifyNetRevenue / data.totalSpend) * 100) / 100
            : 0,
        format: 'ratio',
        benchmark: { good: 5, warning: 3, danger: 1 },
    },
    {
        key: 'netProfit',
        label: 'Net Profit',
        fullName: 'Net Profit (Est.)',
        formula: 'revenue - COGS - spend - discounts - refunds',
        description: 'Estimated net profit after all deductions.',
        compute: (data) => {
            const cogs = data.grossRevenue * (data.cogsPercent || 0.35); // default 35% COGS
            return Math.round((data.shopifyNetRevenue - cogs - data.totalSpend) * 100) / 100;
        },
        format: 'currency',
        benchmark: { good: 1, warning: 0, danger: -1 },
    },
    {
        key: 'cac',
        label: 'CAC',
        fullName: 'Customer Acquisition Cost',
        formula: 'spend / orders',
        description: 'Cost to acquire one customer via paid ads.',
        compute: (data) => data.actualOrders > 0
            ? Math.round((data.totalSpend / data.actualOrders) * 100) / 100
            : 0,
        format: 'currency',
        benchmark: { good: 25, warning: 50, danger: 100 },
    },
    {
        key: 'ltv_cac',
        label: 'LTV:CAC',
        fullName: 'Lifetime Value to CAC Ratio',
        formula: '(revenue / orders) / CAC',
        description: 'How much a customer is worth vs cost to acquire.',
        compute: (data) => {
            const aov = data.actualOrders > 0 ? data.shopifyNetRevenue / data.actualOrders : 0;
            const cac = data.actualOrders > 0 ? data.totalSpend / data.actualOrders : 1;
            return cac > 0 ? Math.round((aov / cac) * 100) / 100 : 0;
        },
        format: 'ratio',
        benchmark: { good: 3, warning: 2, danger: 1 },
    },
    {
        key: 'aov',
        label: 'AOV',
        fullName: 'Average Order Value',
        formula: 'revenue / orders',
        description: 'Average revenue per order (net of discounts/refunds).',
        compute: (data) => data.actualOrders > 0
            ? Math.round((data.shopifyNetRevenue / data.actualOrders) * 100) / 100
            : 0,
        format: 'currency',
        benchmark: { good: 80, warning: 40, danger: 20 },
    },
    {
        key: 'adSpendEfficiency',
        label: 'Ad Spend Efficiency',
        fullName: 'Ad Spend Efficiency',
        formula: '(trueROAS - reportedROAS) / reportedROAS',
        description: 'How much the ad platform is overstating your returns.',
        compute: (data) => data.reportedRoas > 0
            ? Math.round(((data.trueRoas - data.reportedRoas) / data.reportedRoas) * 1000) / 10
            : 0,
        format: 'percent',
        benchmark: { good: -10, warning: -25, danger: -50 },
    },
];

/**
 * Compute all KPIs for a reconciliation report
 * @param {Object} reportData - The full reconciliation report
 * @param {Array} customKpis - Optional custom KPI definitions from agency settings
 * @param {Object} settings - Optional settings like COGS %, custom labels
 */
function computeKPIs(reportData, customKpis = [], settings = {}) {
    // Prepare data for computation
    const data = {
        shopifyNetRevenue: reportData.shopify?.netRevenue || reportData.shopifyNetRevenue || 0,
        grossRevenue: reportData.shopify?.grossRevenue || reportData.grossRevenue || 0,
        totalSpend: reportData.adPlatform?.totalSpend || reportData.totalSpend || 0,
        totalDiscounts: reportData.shopify?.totalDiscounts || reportData.totalDiscounts || 0,
        totalRefunds: reportData.shopify?.totalRefunds || reportData.totalRefunds || 0,
        actualOrders: reportData.shopify?.totalOrders || reportData.actualOrders || 0,
        reportedRoas: reportData.adPlatform?.reportedRoas || reportData.reportedRoas || 0,
        trueRoas: reportData.trueRoas || 0,
        phantomPct: reportData.phantomPct || 0,
        cogsPercent: settings.cogsPercent || 0.35,
    };

    const results = [];

    // Compute default KPIs
    for (const kpi of DEFAULT_KPIS) {
        const value = kpi.compute(data);
        const benchmark = kpi.benchmark;

        let status, statusColor;
        if (kpi.format === 'percent') {
            // Lower is better for ad spend efficiency (negative = overstating)
            status = value >= benchmark.good ? 'Good' : value >= benchmark.warning ? 'Warning' : 'Critical';
            statusColor = value >= benchmark.good ? 'green' : value >= benchmark.warning ? 'amber' : 'red';
        } else if (kpi.key === 'cac') {
            // Lower is better for CAC
            status = value <= benchmark.good ? 'Good' : value <= benchmark.warning ? 'Warning' : 'Critical';
            statusColor = value <= benchmark.good ? 'green' : value <= benchmark.warning ? 'amber' : 'red';
        } else {
            // Higher is better for most metrics
            status = value >= benchmark.good ? 'Good' : value >= benchmark.warning ? 'Warning' : 'Critical';
            statusColor = value >= benchmark.good ? 'green' : value >= benchmark.warning ? 'amber' : 'red';
        }

        // Allow custom label overrides
        const customOverride = customKpis.find(c => c.key === kpi.key);

        results.push({
            key: kpi.key,
            label: customOverride?.label || kpi.label,
            fullName: customOverride?.fullName || kpi.fullName,
            value,
            format: kpi.format,
            description: kpi.description,
            formula: kpi.formula,
            status,
            statusColor,
        });
    }

    return results;
}

/**
 * Format a KPI value for display
 */
function formatKPIValue(value, format) {
    switch (format) {
        case 'currency':
            return '€' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        case 'ratio':
            return value.toFixed(2) + '×';
        case 'percent':
            return value.toFixed(1) + '%';
        default:
            return value.toString();
    }
}

module.exports = { computeKPIs, formatKPIValue, DEFAULT_KPIS };
