// __tests__/optimizer.test.js
// Tests for the Budget Reallocation Engine

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateRecommendations, getQuickSummary } = require('../lib/optimizer');

describe('generateRecommendations', () => {
    it('should return empty results for empty campaigns', () => {
        const result = generateRecommendations([], 10000);
        assert.deepStrictEqual(result.actions, []);
        assert.deepStrictEqual(result.summary, {});
    });

    it('should return empty results for null campaigns', () => {
        const result = generateRecommendations(null, 10000);
        assert.deepStrictEqual(result.actions, []);
    });

    it('should PAUSE campaigns with trueROAS < 1', () => {
        const campaigns = [{
            campaignName: 'Losing Campaign',
            channel: 'Meta',
            spend: 5000,
            estimatedTrueRoas: 0.5,
            reportedRoas: 3.0,
        }];

        const result = generateRecommendations(campaigns, 5000);
        assert.equal(result.actions.length, 1);
        assert.equal(result.actions[0].action, 'PAUSE');
        assert.equal(result.actions[0].severity, 'critical');
        assert.equal(result.actions[0].recommendedSpend, 0);
        assert.equal(result.actions[0].savedBudget, 5000);
    });

    it('should REDUCE campaigns with trueROAS 1-2', () => {
        const campaigns = [{
            campaignName: 'Thin Margin',
            channel: 'Google',
            spend: 4000,
            estimatedTrueRoas: 1.3,
            reportedRoas: 4.0,
        }];

        const result = generateRecommendations(campaigns, 4000);
        assert.equal(result.actions[0].action, 'REDUCE');
        assert.equal(result.actions[0].severity, 'warning');
        // trueROAS 1.3 < 1.5 → 50% reduction
        assert.equal(result.actions[0].recommendedSpend, 2000);
    });

    it('should MAINTAIN campaigns with trueROAS 2-5', () => {
        const campaigns = [{
            campaignName: 'Healthy Campaign',
            channel: 'Meta',
            spend: 3000,
            estimatedTrueRoas: 3.5,
            reportedRoas: 5.0,
        }];

        const result = generateRecommendations(campaigns, 3000);
        assert.equal(result.actions[0].action, 'MAINTAIN');
        assert.equal(result.actions[0].recommendedSpend, 3000);
    });

    it('should SCALE campaigns with trueROAS > 5', () => {
        const campaigns = [{
            campaignName: 'Winner',
            channel: 'Meta',
            spend: 2000,
            estimatedTrueRoas: 7.0,
            reportedRoas: 10.0,
        }];

        const result = generateRecommendations(campaigns, 2000);
        assert.equal(result.actions[0].action, 'SCALE');
        assert.equal(result.actions[0].severity, 'opportunity');
    });

    it('should reallocate freed budget from PAUSE/REDUCE to SCALE winners', () => {
        const campaigns = [
            { campaignName: 'Loser', channel: 'Meta', spend: 3000, estimatedTrueRoas: 0.5, reportedRoas: 2.0 },
            { campaignName: 'Winner', channel: 'Google', spend: 2000, estimatedTrueRoas: 8.0, reportedRoas: 10.0 },
        ];

        const result = generateRecommendations(campaigns, 5000);
        const pauseAction = result.actions.find(a => a.action === 'PAUSE');
        const scaleAction = result.actions.find(a => a.action === 'SCALE');

        assert.ok(pauseAction, 'Should have a PAUSE action');
        assert.ok(scaleAction, 'Should have a SCALE action');
        assert.equal(pauseAction.savedBudget, 3000);
        // Winner should receive the freed $3000
        assert.equal(scaleAction.recommendedSpend, 2000 + 3000);
        assert.equal(scaleAction.budgetIncrease, 3000);
    });

    it('should calculate correct summary metrics', () => {
        const campaigns = [
            { campaignName: 'A', channel: 'Meta', spend: 5000, estimatedTrueRoas: 0.5, reportedRoas: 3.0 },
            { campaignName: 'B', channel: 'Meta', spend: 3000, estimatedTrueRoas: 3.5, reportedRoas: 5.0 },
            { campaignName: 'C', channel: 'Google', spend: 2000, estimatedTrueRoas: 7.0, reportedRoas: 10.0 },
        ];

        const result = generateRecommendations(campaigns, 10000);
        assert.equal(result.summary.pauseCount, 1);
        assert.equal(result.summary.maintainCount, 1);
        assert.equal(result.summary.scaleCount, 1);
        assert.equal(result.summary.freedBudget, 5000);
        assert.equal(result.summary.totalCurrentSpend, 10000);
    });

    it('should sort actions by severity (critical first)', () => {
        const campaigns = [
            { campaignName: 'Healthy', channel: 'Meta', spend: 1000, estimatedTrueRoas: 3.0, reportedRoas: 4.0 },
            { campaignName: 'Loser', channel: 'Meta', spend: 1000, estimatedTrueRoas: 0.3, reportedRoas: 2.0 },
            { campaignName: 'Winner', channel: 'Meta', spend: 1000, estimatedTrueRoas: 6.0, reportedRoas: 8.0 },
        ];

        const result = generateRecommendations(campaigns, 3000);
        assert.equal(result.actions[0].severity, 'critical');
        assert.equal(result.actions[1].severity, 'opportunity');
        assert.equal(result.actions[2].severity, 'ok');
    });
});

describe('getQuickSummary', () => {
    it('should generate human-readable summary text', () => {
        const summary = {
            pauseCount: 2,
            reduceCount: 1,
            scaleCount: 1,
            freedBudget: 5000,
            estimatedAdditionalRevenue: 8000,
        };
        const text = getQuickSummary(summary);
        assert.ok(text.includes('Pause 2 unprofitable'));
        assert.ok(text.includes('Scale 1 winners'));
        assert.ok(text.includes('$5000'));
    });

    it('should handle zero counts gracefully', () => {
        const summary = { pauseCount: 0, reduceCount: 0, scaleCount: 0, freedBudget: 0, estimatedAdditionalRevenue: 0 };
        const text = getQuickSummary(summary);
        assert.equal(text, '');
    });
});
