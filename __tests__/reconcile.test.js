// __tests__/reconcile.test.js
// Tests for the core reconciliation engine

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { reconcile } = require('../lib/reconcile');

// ─── Test fixtures ────────────────────────────────────────────────────────
const shopifyData = {
    totalOrders: 1342,
    grossRevenue: 185000,
    totalDiscounts: 12500,
    totalRefunds: 8200,
    chargebacks: 1800,
    netRevenue: 162500,
    refundedOrders: 42,
};

const adPlatformData = {
    totalSpend: 62000,
    reportedPurchases: 1890,
    reportedRevenue: 245000,
    reportedRoas: 3.95,
    campaigns: [
        { campaignName: 'Search - Brand', channel: 'Google', spend: 5000, reportedRoas: 10.0, purchaseValue: 50000 },
        { campaignName: 'PMax - Best Sellers', channel: 'Google', spend: 18000, reportedRoas: 4.2, purchaseValue: 75600 },
        { campaignName: 'Retargeting - 7d', channel: 'Meta', spend: 8000, reportedRoas: 6.5, purchaseValue: 52000 },
        { campaignName: 'Prospecting - Broad', channel: 'Meta', spend: 15000, reportedRoas: 3.0, purchaseValue: 45000 },
        { campaignName: 'TikTok - UGC', channel: 'TikTok', spend: 12000, reportedRoas: 1.7, purchaseValue: 20400 },
        { campaignName: 'Brand Awareness', channel: 'Meta', spend: 4000, reportedRoas: 0.5, purchaseValue: 2000 },
    ],
};

describe('reconcile', () => {
    it('should calculate phantom revenue correctly', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // Phantom = reported - net = 245000 - 162500 = 82500
        assert.equal(result.phantomRevenue, 82500);
    });

    it('should calculate phantom percentage', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // 82500 / 245000 = 33.67%
        assert.equal(result.phantomPct, 33.7);
    });

    it('should calculate true ROAS', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // 162500 / 62000 = 2.62
        assert.equal(result.trueRoas, 2.62);
    });

    it('should calculate true CPA', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // 62000 / 1342 = 46.20
        assert.equal(result.trueCpa, 46.2);
    });

    it('should calculate ROAS overstatement', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // 3.95 - 2.62 = 1.33
        assert.equal(result.roasOverstatement, 1.33);
    });

    it('should calculate phantom purchases', () => {
        const result = reconcile(shopifyData, adPlatformData);
        // 1890 - 1342 = 548
        assert.equal(result.phantomPurchases, 548);
    });

    it('should produce gap decomposition with 4 items', () => {
        const result = reconcile(shopifyData, adPlatformData);
        assert.equal(result.gapDecomposition.length, 4);
        assert.equal(result.gapDecomposition[0].label, 'Discount codes');
        assert.equal(result.gapDecomposition[0].value, 12500);
    });

    it('should flag campaigns correctly', () => {
        const result = reconcile(shopifyData, adPlatformData);

        // Brand Awareness: estimatedTrueRoas is very low → should be 'Unprofitable' / red
        const brandAwareness = result.campaigns.find(c => c.campaignName === 'Brand Awareness');
        assert.ok(brandAwareness);
        assert.equal(brandAwareness.flagColor, 'red');

        // Search - Brand: high ROAS → should be 'Reasonable' / green
        const searchBrand = result.campaigns.find(c => c.campaignName === 'Search - Brand');
        assert.ok(searchBrand);
        assert.equal(searchBrand.flagColor, 'green');
    });

    it('should calculate estimatedTrueRoas for each campaign', () => {
        const result = reconcile(shopifyData, adPlatformData);
        for (const c of result.campaigns) {
            assert.ok(typeof c.estimatedTrueRoas === 'number');
            assert.ok(c.estimatedTrueRoas >= 0);
        }
    });

    it('should calculate annualized phantom and budget at risk', () => {
        const result = reconcile(shopifyData, adPlatformData);
        assert.equal(result.annualizedPhantom, 82500 * 12);
        // budgetAtRisk = totalSpend × (phantomPct / 100) = 62000 × 0.337 ≈ 20894
        assert.ok(result.budgetAtRisk > 0);
    });

    it('should handle zero ad spend without crashing', () => {
        const zeroSpend = { ...adPlatformData, totalSpend: 0, reportedRevenue: 0, reportedRoas: 0, reportedPurchases: 0 };
        const result = reconcile(shopifyData, zeroSpend);
        assert.equal(result.trueRoas, 0);
        assert.equal(result.trueCpa, 0);
    });

    it('should handle zero orders without crashing', () => {
        const zeroOrders = { ...shopifyData, totalOrders: 0 };
        const result = reconcile(zeroOrders, adPlatformData);
        assert.equal(result.trueCpa, 0);
    });

    it('should return null ga4 when no GA4 data provided', () => {
        const result = reconcile(shopifyData, adPlatformData);
        assert.equal(result.ga4, null);
    });

    it('should include GA4 reconciliation when GA4 data provided', () => {
        const ga4Data = {
            totalRevenue: 160000,
            totalTransactions: 1320,
            totalSessions: 45000,
            channelData: {},
        };
        const result = reconcile(shopifyData, adPlatformData, ga4Data);
        assert.ok(result.ga4);
        assert.equal(result.ga4.ga4Revenue, 160000);
        assert.equal(result.ga4.ga4Transactions, 1320);
        assert.ok(typeof result.ga4.ga4AgreementPct === 'number');
        assert.ok(result.ga4.trustRanking.length === 3);
    });

    it('should calculate GA4 agreement score', () => {
        const ga4Data = {
            totalRevenue: 160000, // close to Shopify 162500
            totalTransactions: 1320,
            totalSessions: 45000,
            channelData: {},
        };
        const result = reconcile(shopifyData, adPlatformData, ga4Data);
        // |160000 - 162500| / 162500 = 1.54% gap → agreement 98.5%
        assert.ok(result.ga4.ga4AgreementPct > 95, `Expected > 95%, got ${result.ga4.ga4AgreementPct}%`);
    });
});
