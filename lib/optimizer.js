// lib/optimizer.js
// Budget Reallocation Engine — computes optimal budget distribution based on TRUE ROAS
// This is what makes Calyxra fix the problem, not just show it

/**
 * Generate budget reallocation recommendations
 * Based on true ROAS (not inflated platform numbers)
 * 
 * Strategy:
 * 1. Campaigns with trueROAS < 1 → PAUSE (money burner)
 * 2. Campaigns with trueROAS 1-2 → REDUCE spend by 30-50%
 * 3. Campaigns with trueROAS 2-5 → MAINTAIN current spend
 * 4. Campaigns with trueROAS > 5 → INCREASE spend (proven winner)
 * 
 * The freed budget from paused/reduced campaigns gets reallocated
 * to winners proportionally by their true ROAS score
 */
function generateRecommendations(campaigns, totalBudget) {
    if (!campaigns || campaigns.length === 0) return { actions: [], summary: {} };

    const actions = [];
    let freedBudget = 0;
    let currentTotalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

    // Phase 1: Classify each campaign and calculate actions
    for (const campaign of campaigns) {
        const trueRoas = campaign.estimatedTrueRoas || 0;
        const spend = campaign.spend || 0;
        const name = campaign.campaignName || campaign.name || 'Unknown';

        if (trueRoas < 1) {
            // PAUSE — losing money
            actions.push({
                campaignName: name,
                channel: campaign.channel || 'Unknown',
                action: 'PAUSE',
                severity: 'critical',
                currentSpend: spend,
                recommendedSpend: 0,
                savedBudget: spend,
                trueRoas,
                reportedRoas: campaign.reportedRoas || 0,
                reason: `True ROAS ${trueRoas}× means you lose $${Math.round(spend - (spend * trueRoas))} for every $${Math.round(spend)} spent. Immediate pause recommended.`,
                impact: `Saves $${Math.round(spend)}/period — reallocate to winning campaigns`,
                emoji: '🔴',
            });
            freedBudget += spend;

        } else if (trueRoas < 2) {
            const reduction = trueRoas < 1.5 ? 0.5 : 0.3;
            const newSpend = Math.round(spend * (1 - reduction));
            const saved = spend - newSpend;

            actions.push({
                campaignName: name,
                channel: campaign.channel || 'Unknown',
                action: 'REDUCE',
                severity: 'warning',
                currentSpend: spend,
                recommendedSpend: newSpend,
                savedBudget: saved,
                trueRoas,
                reportedRoas: campaign.reportedRoas || 0,
                reason: `True ROAS ${trueRoas}× is barely profitable. Reduce by ${Math.round(reduction * 100)}% and monitor for 7 days.`,
                impact: `Frees $${Math.round(saved)}/period for reallocation`,
                emoji: '🟡',
            });
            freedBudget += saved;

        } else if (trueRoas >= 5) {
            actions.push({
                campaignName: name,
                channel: campaign.channel || 'Unknown',
                action: 'SCALE',
                severity: 'opportunity',
                currentSpend: spend,
                recommendedSpend: spend, // will be increased with freed budget
                savedBudget: 0,
                trueRoas,
                reportedRoas: campaign.reportedRoas || 0,
                reason: `True ROAS ${trueRoas}× — proven winner. Scale with budget freed from underperformers.`,
                impact: `Candidate for budget increase`,
                emoji: '🟢',
            });

        } else {
            actions.push({
                campaignName: name,
                channel: campaign.channel || 'Unknown',
                action: 'MAINTAIN',
                severity: 'ok',
                currentSpend: spend,
                recommendedSpend: spend,
                savedBudget: 0,
                trueRoas,
                reportedRoas: campaign.reportedRoas || 0,
                reason: `True ROAS ${trueRoas}× is healthy. Maintain current budget.`,
                impact: `No change needed`,
                emoji: '✅',
            });
        }
    }

    // Phase 2: Reallocate freed budget to winners
    const winners = actions.filter(a => a.action === 'SCALE');
    if (winners.length > 0 && freedBudget > 0) {
        const totalWinnerRoas = winners.reduce((s, w) => s + w.trueRoas, 0);

        for (const winner of winners) {
            const share = winner.trueRoas / totalWinnerRoas;
            const extraBudget = Math.round(freedBudget * share);
            winner.recommendedSpend = winner.currentSpend + extraBudget;
            winner.budgetIncrease = extraBudget;
            winner.impact = `+$${extraBudget} budget increase (${Math.round(share * 100)}% of freed budget). Expected additional revenue: ~$${Math.round(extraBudget * winner.trueRoas)}`;
        }
    }

    // Phase 3: Calculate summary metrics
    const totalCurrentSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRecommendedSpend = actions.reduce((s, a) => s + a.recommendedSpend, 0);
    const pauseCount = actions.filter(a => a.action === 'PAUSE').length;
    const reduceCount = actions.filter(a => a.action === 'REDUCE').length;
    const scaleCount = actions.filter(a => a.action === 'SCALE').length;
    const maintainCount = actions.filter(a => a.action === 'MAINTAIN').length;

    // Calculate projected ROAS after optimization
    const projectedRevenue = actions
        .filter(a => a.action !== 'PAUSE')
        .reduce((s, a) => s + (a.recommendedSpend * a.trueRoas), 0);
    const projectedRoas = totalRecommendedSpend > 0
        ? Math.round((projectedRevenue / totalRecommendedSpend) * 100) / 100
        : 0;

    const currentTrueRoas = totalCurrentSpend > 0
        ? Math.round((campaigns.reduce((s, c) => s + (c.spend * (c.estimatedTrueRoas || 0)), 0) / totalCurrentSpend) * 100) / 100
        : 0;

    const roasImprovement = projectedRoas - currentTrueRoas;
    const estimatedAdditionalRevenue = Math.round(totalRecommendedSpend * roasImprovement);

    const summary = {
        totalCurrentSpend: Math.round(totalCurrentSpend),
        totalRecommendedSpend: Math.round(totalRecommendedSpend),
        freedBudget: Math.round(freedBudget),
        pauseCount,
        reduceCount,
        scaleCount,
        maintainCount,
        currentTrueRoas,
        projectedRoas,
        roasImprovement: Math.round(roasImprovement * 100) / 100,
        estimatedAdditionalRevenue: Math.max(0, estimatedAdditionalRevenue),
        estimatedAnnualImpact: Math.max(0, estimatedAdditionalRevenue * 12),
    };

    // Sort actions: critical first, then warning, then opportunity, then ok
    const severityOrder = { critical: 0, warning: 1, opportunity: 2, ok: 3 };
    actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { actions, summary };
}

/**
 * Generate a one-line action summary for quick display
 */
function getQuickSummary(summary) {
    const parts = [];
    if (summary.pauseCount > 0) parts.push(`Pause ${summary.pauseCount} unprofitable`);
    if (summary.reduceCount > 0) parts.push(`Reduce ${summary.reduceCount} thin-margin`);
    if (summary.scaleCount > 0) parts.push(`Scale ${summary.scaleCount} winners`);
    if (summary.freedBudget > 0) parts.push(`Free $${summary.freedBudget} for reallocation`);
    if (summary.estimatedAdditionalRevenue > 0) parts.push(`+$${summary.estimatedAdditionalRevenue} projected revenue`);
    return parts.join(' · ');
}

module.exports = { generateRecommendations, getQuickSummary };
