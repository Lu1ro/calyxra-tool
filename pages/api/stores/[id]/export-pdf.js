// pages/api/stores/[id]/export-pdf.js
// Generate a branded PDF reconciliation report with Action Engine data

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/db';
import { computeKPIs, formatKPIValue } from '../../../../lib/kpis';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;

    // Get store + agency branding + latest report
    const store = await prisma.store.findFirst({
        where: { id, agencyId: session.user.agencyId },
        include: {
            agency: {
                select: {
                    name: true, logoUrl: true, brandColor: true,
                    brandName: true, reportHeader: true, reportFooter: true,
                    customKpis: true, tier: true,
                },
            },
            reports: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { campaigns: true },
            },
        },
    });

    if (!store) return res.status(404).json({ error: 'Store not found' });

    // Free tier cannot export PDF
    if (store.agency?.tier === 'free') {
        return res.status(403).json({ error: 'Upgrade required to download PDF' });
    }

    if (!store.reports.length) return res.status(404).json({ error: 'No reports found' });

    const report = store.reports[0];
    const agency = store.agency;
    const brandName = agency.brandName || 'Calyxra';
    const brandColor = agency.brandColor || '#064E3B';
    const customKpis = agency.customKpis ? JSON.parse(agency.customKpis) : [];

    // Parse fullReport JSON
    let fullReport = {};
    try { fullReport = JSON.parse(report.fullReport); } catch (e) { }

    // Compute KPIs
    const kpis = computeKPIs(fullReport, customKpis);

    // Generate HTML for PDF
    const html = generateReportHTML({
        store, report, fullReport, agency, brandName, brandColor, kpis, customKpis,
    });

    // Return HTML (frontend can use print-to-PDF or we can convert server-side)
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
}

function generateReportHTML({ store, report, fullReport, agency, brandName, brandColor, kpis }) {
    const fmt = (v) => '$' + (v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const date = new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const campaignRows = (fullReport.campaigns || report.campaigns || []).map(c => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.campaignName || c.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.channel}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(c.spend)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.reportedRoas}×</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${c.flagColor === 'red' ? '#dc2626' : c.flagColor === 'amber' ? '#f59e0b' : '#064E3B'};font-weight:600">${(c.estimatedTrueRoas || c.trueRoas || 0).toFixed(2)}×</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
                <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${c.flagColor === 'red' ? '#fee2e2' : c.flagColor === 'amber' ? '#fef3c7' : '#e6f7f4'};color:${c.flagColor === 'red' ? '#dc2626' : c.flagColor === 'amber' ? '#92400e' : '#064E3B'}">${c.flag}</span>
            </td>
        </tr>
    `).join('');

    const kpiCards = kpis.map(k => `
        <div style="flex:1;min-width:140px;background:${k.statusColor === 'green' ? '#ECFDF5' : k.statusColor === 'amber' ? '#fffbeb' : '#fef2f2'};border-radius:8px;padding:14px;text-align:center;border:1px solid ${k.statusColor === 'green' ? '#bbf7d0' : k.statusColor === 'amber' ? '#fde68a' : '#fecaca'}">
            <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-bottom:6px">${k.label}</div>
            <div style="font-size:22px;font-weight:700;color:${k.statusColor === 'green' ? '#064E3B' : k.statusColor === 'amber' ? '#92400e' : '#dc2626'}">${formatKPIValue(k.value, k.format)}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:4px">${k.fullName}</div>
        </div>
    `).join('');

    // GA4 section
    let ga4Section = '';
    if (fullReport.ga4) {
        ga4Section = `
            <div style="margin-top:32px;border:2px solid #e0e7ff;border-radius:10px;padding:20px">
                <h2 style="margin:0 0 16px;font-size:16px;color:${brandColor}">📊 3-Way Revenue Truth</h2>
                <div style="display:flex;gap:16px;margin-bottom:16px">
                    <div style="flex:1;background:#f0f9ff;border-radius:8px;padding:14px;text-align:center">
                        <div style="font-size:11px;color:#6b7280;font-weight:600">GA4 Agreement</div>
                        <div style="font-size:28px;font-weight:700;color:${fullReport.ga4.ga4AgreementPct >= 90 ? '#064E3B' : fullReport.ga4.ga4AgreementPct >= 70 ? '#f59e0b' : '#dc2626'}">${fullReport.ga4.ga4AgreementPct}%</div>
                    </div>
                    ${(fullReport.ga4.trustRanking || []).map((t, i) => `
                        <div style="flex:1;background:#fefce8;border-radius:8px;padding:14px">
                            <div style="font-size:11px;color:#6b7280;font-weight:600">${i + 1}. ${t.source}</div>
                            <div style="font-size:20px;font-weight:700;color:#111827">${fmt(t.revenue)}</div>
                            <div style="font-size:10px;color:#6b7280">${t.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ⚡ ACTION ENGINE SECTION — the key addition
    let actionEngineSection = '';
    if (fullReport.optimizer) {
        const opt = fullReport.optimizer;
        const summary = opt.summary || {};
        const actions = opt.actions || [];

        const actionRows = actions.map(a => {
            const actionColor = a.action === 'PAUSE' ? '#dc2626' : a.action === 'REDUCE' ? '#f59e0b' : a.action === 'SCALE' ? '#064E3B' : '#6b7280';
            const bgColor = a.action === 'PAUSE' ? '#fef2f2' : a.action === 'REDUCE' ? '#fffbeb' : a.action === 'SCALE' ? '#ECFDF5' : '#f9fafb';
            return `
                <tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
                        <span style="padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;background:${actionColor};color:#fff;margin-right:6px">${a.action}</span>
                        ${a.campaignName}
                    </td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280">${a.channel}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(a.currentSpend)}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${actionColor}">${fmt(a.recommendedSpend)}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${actionColor}">${a.trueRoas}×</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151">${a.reason}</td>
                </tr>
            `;
        }).join('');

        actionEngineSection = `
            <div style="margin-top:32px;border:2px solid #111827;border-radius:10px;padding:20px;page-break-inside:avoid">
                <h2 style="margin:0 0 16px;font-size:16px;color:#111827">⚡ Action Engine — Budget Optimization Plan</h2>

                <!-- Summary Stats -->
                <div style="display:flex;gap:10px;margin-bottom:20px">
                    <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center">
                        <div style="font-size:22px;font-weight:700;color:#dc2626">${summary.pauseCount || 0}</div>
                        <div style="font-size:10px;color:#6b7280">Pause</div>
                    </div>
                    <div style="flex:1;background:#fffbeb;border-radius:8px;padding:12px;text-align:center">
                        <div style="font-size:22px;font-weight:700;color:#f59e0b">${summary.reduceCount || 0}</div>
                        <div style="font-size:10px;color:#6b7280">Reduce</div>
                    </div>
                    <div style="flex:1;background:#ECFDF5;border-radius:8px;padding:12px;text-align:center">
                        <div style="font-size:22px;font-weight:700;color:#064E3B">${summary.scaleCount || 0}</div>
                        <div style="font-size:10px;color:#6b7280">Scale</div>
                    </div>
                    <div style="flex:1;background:#ede9fe;border-radius:8px;padding:12px;text-align:center">
                        <div style="font-size:22px;font-weight:700;color:#7c3aed">${fmt(summary.freedBudget)}</div>
                        <div style="font-size:10px;color:#6b7280">Budget Freed</div>
                    </div>
                    <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:12px;text-align:center">
                        <div style="font-size:22px;font-weight:700;color:#064E3B">${summary.projectedRoas || 0}×</div>
                        <div style="font-size:10px;color:#6b7280">Projected ROAS</div>
                    </div>
                    <div style="flex:1;background:#ECFDF5;border-radius:8px;padding:12px;text-align:center;border:1px solid #bbf7d0">
                        <div style="font-size:22px;font-weight:700;color:#064E3B">+${fmt(summary.estimatedAdditionalRevenue)}</div>
                        <div style="font-size:10px;color:#6b7280">Est. Revenue Gain</div>
                    </div>
                </div>

                <!-- Action Details Table -->
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="border-bottom:2px solid #111827">
                            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280">Campaign</th>
                            <th style="padding:8px 12px;text-align:center;font-weight:600;color:#6b7280">Channel</th>
                            <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">Current</th>
                            <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">Recommended</th>
                            <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">True ROAS</th>
                            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280">Reason</th>
                        </tr>
                    </thead>
                    <tbody>${actionRows}</tbody>
                </table>

                <!-- Annual Impact -->
                ${summary.estimatedAnnualImpact > 0 ? `
                    <div style="margin-top:16px;background:#111827;color:#fff;border-radius:8px;padding:16px;text-align:center">
                        <div style="font-size:11px;text-transform:uppercase;opacity:0.7;margin-bottom:4px">Estimated Annual Impact of Optimization</div>
                        <div style="font-size:28px;font-weight:700;color:#00d2a0">+${fmt(summary.estimatedAnnualImpact)}</div>
                        <div style="font-size:11px;opacity:0.6;margin-top:4px">Based on reallocating ${fmt(summary.freedBudget)} from underperformers to proven winners</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${store.name} — Revenue Reconciliation Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #111827; padding: 40px; max-width: 900px; margin: 0 auto; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:3px solid ${brandColor}">
        <div style="display:flex;align-items:center;gap:10px">
            ${agency.logoUrl ? `<img src="${agency.logoUrl}" style="height:40px" />` : ''}
            <span style="font-family:'DM Serif Display',serif;font-size:24px;color:${brandColor}">${brandName}</span>
        </div>
        <div style="text-align:right">
            <div style="font-size:12px;color:#6b7280">Revenue Reconciliation Report</div>
            <div style="font-size:14px;font-weight:600">${date}</div>
        </div>
    </div>

    ${agency.reportHeader ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;font-size:13px;color:#374151">${agency.reportHeader}</div>` : ''}

    <!-- Store Info -->
    <h1 style="font-family:'DM Serif Display',serif;font-size:22px;color:#111827;margin-bottom:4px">${store.name}</h1>
    <p style="font-size:13px;color:#6b7280;margin-bottom:24px">${store.domain} · Period: ${report.dateFrom} to ${report.dateTo}</p>

    <!-- Top KPIs -->
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px;background:${brandColor}11;border-radius:10px;padding:16px;border-left:4px solid ${brandColor}">
            <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Phantom Revenue</div>
            <div style="font-size:28px;font-weight:700;color:#dc2626">${fmt(report.phantomRevenue)}</div>
            <div style="font-size:13px;color:#dc2626">${report.phantomPct}% overstated</div>
        </div>
        <div style="flex:1;min-width:180px;background:#ECFDF5;border-radius:10px;padding:16px;border-left:4px solid #064E3B">
            <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">True ROAS</div>
            <div style="font-size:28px;font-weight:700;color:#064E3B">${report.trueRoas}×</div>
            <div style="font-size:13px;color:#6b7280">vs ${report.reportedRoas}× reported</div>
        </div>
        <div style="flex:1;min-width:180px;background:#f9fafb;border-radius:10px;padding:16px;border-left:4px solid #374151">
            <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Net Revenue</div>
            <div style="font-size:28px;font-weight:700;color:#111827">${fmt(report.netRevenue)}</div>
            <div style="font-size:13px;color:#6b7280">Shopify verified</div>
        </div>
    </div>

    <!-- Custom KPI Cards -->
    <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
        ${kpiCards}
    </div>

    ${ga4Section}

    <!-- Campaign Table -->
    <div style="margin-top:32px">
        <h2 style="font-size:16px;margin-bottom:12px;color:${brandColor}">🎯 Campaign Performance</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
                <tr style="border-bottom:2px solid ${brandColor}">
                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280">Campaign</th>
                    <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">Channel</th>
                    <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">Spend</th>
                    <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">Reported ROAS</th>
                    <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280">True ROAS</th>
                    <th style="padding:8px 12px;text-align:center;font-weight:600;color:#6b7280">Status</th>
                </tr>
            </thead>
            <tbody>${campaignRows}</tbody>
        </table>
    </div>

    <!-- ACTION ENGINE — Budget Optimization -->
    ${actionEngineSection}

    <!-- Recommendations (legacy fallback if no optimizer) -->
    ${!fullReport.optimizer ? `
    <div style="margin-top:32px">
        <h2 style="font-size:16px;margin-bottom:12px;color:${brandColor}">⚡ Recommended Actions</h2>
        ${(fullReport.campaigns || []).filter(c => c.flagColor === 'red').length > 0 ? `
            <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:14px;margin-bottom:10px">
                <div style="font-weight:600;color:#dc2626;margin-bottom:4px">🔴 Pause Immediately</div>
                <ul style="margin:0;padding-left:20px;font-size:12px;color:#374151">
                    ${(fullReport.campaigns || []).filter(c => c.flagColor === 'red').map(c => `<li>${c.campaignName || c.name} — True ROAS ${(c.estimatedTrueRoas || 0).toFixed(2)}× (${c.flag})</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        ${(fullReport.campaigns || []).filter(c => c.flagColor === 'amber').length > 0 ? `
            <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;padding:14px;margin-bottom:10px">
                <div style="font-weight:600;color:#92400e;margin-bottom:4px">🟡 Investigate</div>
                <ul style="margin:0;padding-left:20px;font-size:12px;color:#374151">
                    ${(fullReport.campaigns || []).filter(c => c.flagColor === 'amber').map(c => `<li>${c.campaignName || c.name} — True ROAS ${(c.estimatedTrueRoas || 0).toFixed(2)}×</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        ${(fullReport.campaigns || []).filter(c => c.flagColor === 'green').length > 0 ? `
            <div style="background:#ECFDF5;border-left:4px solid #064E3B;border-radius:6px;padding:14px">
                <div style="font-weight:600;color:#064E3B;margin-bottom:4px">🟢 Safe to Scale</div>
                <ul style="margin:0;padding-left:20px;font-size:12px;color:#374151">
                    ${(fullReport.campaigns || []).filter(c => c.flagColor === 'green').map(c => `<li>${c.campaignName || c.name} — True ROAS ${(c.estimatedTrueRoas || 0).toFixed(2)}× ✅</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
    ` : ''}

    ${agency.reportFooter ? `<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">${agency.reportFooter}</div>` : ''}

    <!-- Print Button (fallback if opened directly) -->
    <div class="no-print" style="margin-top:32px;text-align:center">
        <button onclick="window.print()" style="padding:12px 32px;background:${brandColor};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button>
    </div>
</body>
</html>`;
}
