// __tests__/alerts.test.js
// Tests for the alert rules engine

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ALERT_RULES } = require('../lib/alerts');

// Helper to get a specific rule
const getRule = (id) => ALERT_RULES.find(r => r.id === id);

describe('Alert Rules', () => {
    it('should have 5 alert rules defined', () => {
        assert.equal(ALERT_RULES.length, 5);
    });

    describe('phantom_spike', () => {
        const rule = getRule('phantom_spike');

        it('should NOT trigger without a previous report', () => {
            const result = rule.evaluate({ phantomPct: 40 }, null);
            assert.equal(result, null);
        });

        it('should NOT trigger for small changes (<5%)', () => {
            const result = rule.evaluate({ phantomPct: 33 }, { phantomPct: 30 });
            assert.equal(result, null);
        });

        it('should trigger medium for 5-10% spike', () => {
            const result = rule.evaluate({ phantomPct: 37 }, { phantomPct: 30 });
            assert.ok(result);
            assert.equal(result.type, 'phantom_spike');
            assert.equal(result.severity, 'medium');
        });

        it('should trigger high for 10-15% spike', () => {
            const result = rule.evaluate({ phantomPct: 42 }, { phantomPct: 30 });
            assert.ok(result);
            assert.equal(result.severity, 'high');
        });

        it('should trigger critical for >=15% spike', () => {
            const result = rule.evaluate({ phantomPct: 50, phantomRevenue: 25000 }, { phantomPct: 30 });
            assert.ok(result);
            assert.equal(result.severity, 'critical');
        });
    });

    describe('roas_drop', () => {
        const rule = getRule('roas_drop');

        it('should NOT trigger without a previous report', () => {
            const result = rule.evaluate({ trueRoas: 1.5 }, null);
            assert.equal(result, null);
        });

        it('should NOT trigger for small ROAS drops (<0.5)', () => {
            const result = rule.evaluate({ trueRoas: 2.8 }, { trueRoas: 3.0 });
            assert.equal(result, null);
        });

        it('should trigger high when ROAS drops below 2', () => {
            const result = rule.evaluate({ trueRoas: 1.5 }, { trueRoas: 3.0 });
            assert.ok(result);
            assert.equal(result.type, 'roas_drop');
            assert.equal(result.severity, 'high');
        });

        it('should trigger critical when ROAS drops below 1 (unprofitable)', () => {
            const result = rule.evaluate({ trueRoas: 0.7 }, { trueRoas: 2.5 });
            assert.ok(result);
            assert.equal(result.severity, 'critical');
            assert.ok(result.message.includes('UNPROFITABLE'));
        });
    });

    describe('unprofitable_campaign', () => {
        const rule = getRule('unprofitable_campaign');

        it('should NOT trigger when no red-flagged campaigns', () => {
            const report = {
                fullReport: JSON.stringify({
                    campaigns: [
                        { campaignName: 'OK', flagColor: 'green', channel: 'Meta', estimatedTrueRoas: 3.0 },
                    ]
                })
            };
            const result = rule.evaluate(report);
            assert.equal(result, null);
        });

        it('should trigger when red-flagged campaigns exist', () => {
            const report = {
                fullReport: JSON.stringify({
                    campaigns: [
                        { campaignName: 'Bad', flagColor: 'red', channel: 'Meta', estimatedTrueRoas: 0.5 },
                        { campaignName: 'Worse', flagColor: 'red', channel: 'Google', estimatedTrueRoas: 0.3 },
                    ]
                })
            };
            const result = rule.evaluate(report);
            assert.ok(result);
            assert.equal(result.type, 'unprofitable_campaign');
            assert.ok(result.title.includes('2 unprofitable campaigns'));
        });

        it('should handle fullReport as object (not just string)', () => {
            const report = {
                fullReport: {
                    campaigns: [
                        { campaignName: 'Bad', flagColor: 'red', channel: 'Meta', estimatedTrueRoas: 0.5 },
                    ]
                }
            };
            const result = rule.evaluate(report);
            assert.ok(result);
        });
    });

    describe('high_phantom', () => {
        const rule = getRule('high_phantom');

        it('should NOT trigger below 40%', () => {
            const result = rule.evaluate({ phantomPct: 35, phantomRevenue: 10000 });
            assert.equal(result, null);
        });

        it('should trigger high at 40-60%', () => {
            const result = rule.evaluate({ phantomPct: 45, phantomRevenue: 20000, reportedRoas: 5, trueRoas: 2.5 });
            assert.ok(result);
            assert.equal(result.severity, 'high');
        });

        it('should trigger critical at >=60%', () => {
            const result = rule.evaluate({ phantomPct: 65, phantomRevenue: 50000, reportedRoas: 8, trueRoas: 2 });
            assert.ok(result);
            assert.equal(result.severity, 'critical');
        });
    });

    describe('stale_data', () => {
        const rule = getRule('stale_data');

        it('should NOT trigger without a previous report', () => {
            const result = rule.evaluate({ createdAt: new Date().toISOString() }, null);
            assert.equal(result, null);
        });

        it('should NOT trigger for fresh data (<3 days)', () => {
            const now = new Date();
            const yesterday = new Date(now - 1 * 24 * 60 * 60 * 1000);
            const result = rule.evaluate(
                { createdAt: now.toISOString() },
                { createdAt: yesterday.toISOString() },
            );
            assert.equal(result, null);
        });

        it('should trigger medium for 3-7 day old data', () => {
            const now = new Date();
            const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
            const result = rule.evaluate(
                { createdAt: now.toISOString() },
                { createdAt: fourDaysAgo.toISOString() },
            );
            assert.ok(result);
            assert.equal(result.severity, 'medium');
        });

        it('should trigger high for >=7 day old data', () => {
            const now = new Date();
            const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
            const result = rule.evaluate(
                { createdAt: now.toISOString() },
                { createdAt: tenDaysAgo.toISOString() },
            );
            assert.ok(result);
            assert.equal(result.severity, 'high');
        });
    });
});
