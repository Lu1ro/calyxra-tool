// __tests__/kpis.test.js
// Tests for the KPI computation engine

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeKPIs, formatKPIValue, DEFAULT_KPIS } = require('../lib/kpis');

describe('computeKPIs', () => {
    const sampleReport = {
        shopify: { netRevenue: 100000, grossRevenue: 120000, totalOrders: 2000, totalDiscounts: 5000, totalRefunds: 3000 },
        adPlatform: { totalSpend: 30000, reportedRoas: 4.5 },
        trueRoas: 3.33,
        phantomPct: 26,
    };

    it('should compute all 6 default KPIs', () => {
        const results = computeKPIs(sampleReport);
        assert.equal(results.length, 6);

        const keys = results.map(r => r.key);
        assert.ok(keys.includes('mer'));
        assert.ok(keys.includes('netProfit'));
        assert.ok(keys.includes('cac'));
        assert.ok(keys.includes('ltv_cac'));
        assert.ok(keys.includes('aov'));
        assert.ok(keys.includes('adSpendEfficiency'));
    });

    it('should compute MER correctly (revenue / spend)', () => {
        const results = computeKPIs(sampleReport);
        const mer = results.find(k => k.key === 'mer');
        // 100000 / 30000 = 3.33
        assert.equal(mer.value, 3.33);
        assert.equal(mer.format, 'ratio');
    });

    it('should compute CAC correctly (spend / orders)', () => {
        const results = computeKPIs(sampleReport);
        const cac = results.find(k => k.key === 'cac');
        // 30000 / 2000 = 15
        assert.equal(cac.value, 15);
        assert.equal(cac.status, 'Good'); // 15 <= 25
    });

    it('should compute AOV correctly (revenue / orders)', () => {
        const results = computeKPIs(sampleReport);
        const aov = results.find(k => k.key === 'aov');
        // 100000 / 2000 = 50
        assert.equal(aov.value, 50);
    });

    it('should compute LTV:CAC = AOV / CAC', () => {
        const results = computeKPIs(sampleReport);
        const ltv = results.find(k => k.key === 'ltv_cac');
        // AOV=50, CAC=15 → 50/15 = 3.33
        assert.equal(ltv.value, 3.33);
        assert.equal(ltv.status, 'Good'); // >= 3
    });

    it('should compute Ad Spend Efficiency', () => {
        const results = computeKPIs(sampleReport);
        const efficiency = results.find(k => k.key === 'adSpendEfficiency');
        // (3.33 - 4.5) / 4.5 = -26% (ad platform overstating by 26%)
        assert.ok(efficiency.value < 0, 'Should be negative (overstated)');
    });

    it('should handle zero spend gracefully', () => {
        const zeroSpend = {
            shopify: { netRevenue: 50000, grossRevenue: 60000, totalOrders: 500 },
            adPlatform: { totalSpend: 0, reportedRoas: 0 },
            trueRoas: 0,
        };
        const results = computeKPIs(zeroSpend);
        const mer = results.find(k => k.key === 'mer');
        assert.equal(mer.value, 0); // no division by zero
    });

    it('should handle zero orders gracefully', () => {
        const zeroOrders = {
            shopify: { netRevenue: 0, grossRevenue: 0, totalOrders: 0 },
            adPlatform: { totalSpend: 1000, reportedRoas: 0 },
            trueRoas: 0,
        };
        const results = computeKPIs(zeroOrders);
        const cac = results.find(k => k.key === 'cac');
        assert.equal(cac.value, 0);
    });

    it('should apply custom COGS percentage from settings', () => {
        const results50 = computeKPIs(sampleReport, [], { cogsPercent: 0.50 });
        const results20 = computeKPIs(sampleReport, [], { cogsPercent: 0.20 });
        const profit50 = results50.find(k => k.key === 'netProfit');
        const profit20 = results20.find(k => k.key === 'netProfit');
        // Higher COGS → lower profit
        assert.ok(profit50.value < profit20.value, 'Higher COGS should yield lower profit');
    });

    it('should assign correct status colors based on benchmarks', () => {
        // Good MER (>5)
        const goodReport = { ...sampleReport, shopify: { ...sampleReport.shopify, netRevenue: 200000 } };
        const results = computeKPIs(goodReport);
        const mer = results.find(k => k.key === 'mer');
        // 200000 / 30000 = 6.67 → good (>= 5)
        assert.equal(mer.statusColor, 'green');
    });
});

describe('formatKPIValue', () => {
    it('should format currency with $ symbol', () => {
        const result = formatKPIValue(1234, 'currency');
        assert.ok(result.startsWith('$'));
    });

    it('should format ratio with × symbol', () => {
        const result = formatKPIValue(3.5, 'ratio');
        assert.equal(result, '3.50×');
    });

    it('should format percent with % symbol', () => {
        const result = formatKPIValue(-26.3, 'percent');
        assert.equal(result, '-26.3%');
    });
});

describe('DEFAULT_KPIS', () => {
    it('should have 6 KPI definitions', () => {
        assert.equal(DEFAULT_KPIS.length, 6);
    });

    it('each KPI should have compute function, format, and benchmark', () => {
        for (const kpi of DEFAULT_KPIS) {
            assert.ok(kpi.key, `KPI missing key`);
            assert.ok(kpi.label, `KPI ${kpi.key} missing label`);
            assert.ok(typeof kpi.compute === 'function', `KPI ${kpi.key} missing compute function`);
            assert.ok(kpi.format, `KPI ${kpi.key} missing format`);
            assert.ok(kpi.benchmark, `KPI ${kpi.key} missing benchmark`);
        }
    });
});
