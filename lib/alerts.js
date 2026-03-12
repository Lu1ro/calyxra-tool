// lib/alerts.js
// Alert rules engine — evaluates reconciliation reports and creates alerts

const { prisma } = require('./db');

/**
 * Alert rule definitions
 * Each rule receives a report + previous report and returns an alert or null
 */
const ALERT_RULES = [
    {
        id: 'phantom_spike',
        name: 'Phantom Revenue Spike',
        evaluate: (report, prev) => {
            if (!prev) return null;
            const delta = report.phantomPct - prev.phantomPct;
            if (delta >= 5) {
                return {
                    type: 'phantom_spike',
                    severity: delta >= 15 ? 'critical' : delta >= 10 ? 'high' : 'medium',
                    title: `Phantom revenue spiked by ${delta.toFixed(1)}%`,
                    message: `Phantom revenue jumped from ${prev.phantomPct}% to ${report.phantomPct}%. ` +
                        `This means ad platforms are overstating revenue by €${Math.round(report.phantomRevenue).toLocaleString()}. ` +
                        `Investigate recent campaign changes.`,
                };
            }
            return null;
        },
    },
    {
        id: 'roas_drop',
        name: 'True ROAS Drop',
        evaluate: (report, prev) => {
            if (!prev) return null;
            const drop = prev.trueRoas - report.trueRoas;
            if (drop >= 0.5 && report.trueRoas < 2) {
                return {
                    type: 'roas_drop',
                    severity: report.trueRoas < 1 ? 'critical' : 'high',
                    title: `True ROAS dropped to ${report.trueRoas}×`,
                    message: `True ROAS fell from ${prev.trueRoas}× to ${report.trueRoas}×. ` +
                        `${report.trueRoas < 1 ? '⚠️ UNPROFITABLE — spending more than earning!' : 'Review campaign performance immediately.'}`,
                };
            }
            return null;
        },
    },
    {
        id: 'unprofitable_campaign',
        name: 'Unprofitable Campaign Detected',
        evaluate: (report) => {
            const fullReport = typeof report.fullReport === 'string'
                ? JSON.parse(report.fullReport)
                : report.fullReport;
            const unprofitable = fullReport?.campaigns?.filter(c => c.flagColor === 'red') || [];
            if (unprofitable.length > 0) {
                return {
                    type: 'unprofitable_campaign',
                    severity: 'high',
                    title: `${unprofitable.length} unprofitable campaign${unprofitable.length > 1 ? 's' : ''} detected`,
                    message: unprofitable.map(c =>
                        `• ${c.campaignName} (${c.channel}) — True ROAS ${c.estimatedTrueRoas}×`
                    ).join('\n'),
                };
            }
            return null;
        },
    },
    {
        id: 'high_phantom',
        name: 'High Phantom Revenue',
        evaluate: (report) => {
            if (report.phantomPct >= 40) {
                return {
                    type: 'high_phantom',
                    severity: report.phantomPct >= 60 ? 'critical' : 'high',
                    title: `${report.phantomPct}% of reported revenue is phantom`,
                    message: `Ad platforms are overstating revenue by €${Math.round(report.phantomRevenue).toLocaleString()} ` +
                        `(${report.phantomPct}% of total). Reported ROAS ${report.reportedRoas}× vs True ROAS ${report.trueRoas}×.`,
                };
            }
            return null;
        },
    },
    {
        id: 'stale_data',
        name: 'Stale Data Warning',
        evaluate: (report, prev) => {
            if (!prev) return null;
            const daysSinceLast = (new Date(report.createdAt) - new Date(prev.createdAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceLast >= 3) {
                return {
                    type: 'stale_data',
                    severity: daysSinceLast >= 7 ? 'high' : 'medium',
                    title: `Data was ${Math.round(daysSinceLast)} days old before this refresh`,
                    message: `Last reconciliation was ${Math.round(daysSinceLast)} days ago. ` +
                        `Consider setting up automated daily syncs.`,
                };
            }
            return null;
        },
    },
];

/**
 * Evaluate all alert rules against a new report
 * @returns {Array} List of triggered alerts
 */
async function evaluateAlerts(storeId, report) {
    // Get previous report for comparison
    const prevReports = await prisma.report.findMany({
        where: { storeId, NOT: { id: report.id } },
        orderBy: { createdAt: 'desc' },
        take: 1,
    });
    const prev = prevReports[0] || null;

    const triggered = [];

    for (const rule of ALERT_RULES) {
        try {
            const alert = rule.evaluate(report, prev);
            if (alert) {
                triggered.push(alert);
            }
        } catch (err) {
            console.error(`Alert rule ${rule.id} failed:`, err.message);
        }
    }

    return triggered;
}

/**
 * Save alerts to the database
 */
async function saveAlerts(storeId, reportId, alerts) {
    const saved = [];
    for (const alert of alerts) {
        const record = await prisma.alert.create({
            data: {
                storeId,
                reportId,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
            },
        });
        saved.push(record);
    }
    return saved;
}

module.exports = { evaluateAlerts, saveAlerts, ALERT_RULES };
