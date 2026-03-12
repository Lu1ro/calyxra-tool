// pages/dashboard/stores/[id].js
// Store Dashboard — refactored to use shared components and design system
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// Shared components
import DashboardLayout from '@/components/DashboardLayout';
import StoreNavbar from '@/components/StoreNavbar';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import Skeleton from '@/components/Skeleton';
import KPICard from '@/components/KPICard';
import EmptyState from '@/components/EmptyState';
import CampaignTable from '@/components/CampaignTable';
import ActionCard from '@/components/ActionCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function StoreDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [latestReport, setLatestReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reconciling, setReconciling] = useState(false);
    const [error, setError] = useState('');
    const [executing, setExecuting] = useState(false);
    const [executingAction, setExecutingAction] = useState(null);
    const [actionResults, setActionResults] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [campaignSearch, setCampaignSearch] = useState('');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const topRef = useRef(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);
    useEffect(() => { if (session && id) fetchStoreData(); }, [session, id]);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 600);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const showToast = (message, type = 'success') => setToast({ message, type });
    const formatCurrency = (val) => '€' + (val || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
    const flagEmoji = (color) => color === 'red' ? '🔴' : color === 'amber' ? '🟡' : '🟢';

    const fetchStoreData = async () => {
        try {
            const storesRes = await fetch('/api/stores');
            const storesData = await storesRes.json();
            setStore(storesData.stores?.find(s => s.id === id));
            const reportsRes = await fetch(`/api/stores/${id}/reports`);
            const reportsData = await reportsRes.json();
            setReports(reportsData.reports || []);
            if (reportsData.reports?.length > 0) setLatestReport(JSON.parse(reportsData.reports[0].fullReport));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const runReconciliation = async (useSample = false) => {
        setReconciling(true); setError('');
        try {
            const res = await fetch(`/api/stores/${id}/reconcile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useSampleData: useSample }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLatestReport(data.report);
            await fetchStoreData();
            showToast(useSample ? 'Demo reconciliation complete!' : 'Reconciliation complete!');
        } catch (err) { setError(err.message); showToast('Reconciliation failed: ' + err.message, 'error'); }
        finally { setReconciling(false); }
    };

    const handleExecuteAll = () => {
        const actions = latestReport?.optimizer?.actions || [];
        const pauseCount = actions.filter(a => a.action === 'PAUSE').length;
        setConfirmModal({
            title: '⚡ Execute All Optimizer Actions?',
            message: `This will execute ${actions.length} campaign actions${pauseCount > 0 ? ` including ${pauseCount} campaign pause(s)` : ''}. This action modifies your live ad accounts.`,
            details: actions.map(a => `${a.action}: ${a.campaignName} (${a.channel}) — ${formatCurrency(a.currentSpend)} → ${formatCurrency(a.recommendedSpend)}`).join('\n'),
            confirmLabel: '🚀 Execute All', danger: pauseCount > 0,
            onConfirm: async () => {
                setConfirmModal(null); setExecuting(true);
                try {
                    const res = await fetch(`/api/stores/${id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions, isDemo: true }) });
                    const data = await res.json();
                    setActionResults(data.results); showToast(`${actions.length} actions executed successfully!`);
                } catch (e) { showToast('Action execution failed: ' + e.message, 'error'); }
                setExecuting(false);
            },
            onCancel: () => setConfirmModal(null),
        });
    };

    const handleExecuteOne = (action) => {
        setConfirmModal({
            title: `${action.action === 'PAUSE' ? '⏸️ Pause' : action.action === 'REDUCE' ? '📉 Reduce' : '📈 Scale'} Campaign?`,
            message: `${action.action} "${action.campaignName}" on ${action.channel}.\n${action.reason}`,
            details: `Budget: ${formatCurrency(action.currentSpend)} → ${formatCurrency(action.recommendedSpend)} · True ROAS: ${action.trueRoas}×`,
            confirmLabel: `${action.action === 'PAUSE' ? '⏸️ Pause Campaign' : action.action === 'REDUCE' ? '📉 Reduce Budget' : '📈 Scale Budget'}`,
            danger: action.action === 'PAUSE',
            onConfirm: async () => {
                setConfirmModal(null); setExecutingAction(action.campaignName);
                try {
                    const res = await fetch(`/api/stores/${id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [action], isDemo: true }) });
                    const data = await res.json();
                    setActionResults(prev => [...(prev || []), ...(data.results || [])]);
                    showToast(`${action.action}: ${action.campaignName} — Done!`);
                } catch (e) { showToast(`Failed: ${e.message}`, 'error'); }
                setExecutingAction(null);
            },
            onCancel: () => setConfirmModal(null),
        });
    };

    if (status === 'loading' || status === 'unauthenticated' || loading) {
        return <div className="page-bg flex-center" style={{ minHeight: '100vh' }}>Loading...</div>;
    }

    const filteredCampaigns = (latestReport?.campaigns || []).filter(c =>
        !campaignSearch || c.campaignName?.toLowerCase().includes(campaignSearch.toLowerCase()) || c.channel?.toLowerCase().includes(campaignSearch.toLowerCase())
    );

    const deduplicatedReports = reports.reduce((acc, r) => {
        const last = acc[acc.length - 1];
        if (last && last.phantomPct === r.phantomPct && last.trueRoas === r.trueRoas && last.netRevenue === r.netRevenue && last.isDemo === r.isDemo) return acc;
        acc.push(r); return acc;
    }, []).slice(0, 10);

    const trendData = reports.length > 1 ? {
        labels: reports.slice().reverse().map(r => new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
        datasets: [{
            label: 'Phantom Revenue %', data: reports.slice().reverse().map(r => r.phantomPct),
            borderColor: 'var(--c-red)', backgroundColor: 'rgba(220, 38, 38, 0.1)', fill: true, tension: 0.4,
        }, {
            label: 'True ROAS', data: reports.slice().reverse().map(r => r.trueRoas),
            borderColor: 'var(--c-green)', backgroundColor: 'rgba(22, 101, 52, 0.1)', fill: true, tension: 0.4, yAxisID: 'y1',
        }],
    } : null;

    const dateRange = latestReport?.dateFrom && latestReport?.dateTo
        ? `${latestReport.dateFrom} to ${latestReport.dateTo}` : reports[0]?.dateFrom && reports[0]?.dateTo
            ? `${reports[0].dateFrom} to ${reports[0].dateTo}` : null;

    return (
        <DashboardLayout title={`${store?.name || 'Store'} — Calyxra Dashboard`}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {confirmModal && <ConfirmModal {...confirmModal} />}

            <div ref={topRef}>
                <StoreNavbar store={store} storeId={id} currentPage={`/dashboard/stores/${id}`} />

                <div className="container">
                    {error && <div className="alert-error">{error}</div>}

                    {/* Actions bar */}
                    <div className="flex-between animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <div>
                            <h1 className="heading-serif" style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>{store?.name} Dashboard</h1>
                            {dateRange && <p className="text-muted text-base" style={{ margin: '4px 0 0' }}>📅 Report period: {dateRange}</p>}
                        </div>
                        <div className="flex-gap-2 no-print">
                            <button className="btn btn-secondary" onClick={() => runReconciliation(true)} disabled={reconciling}>
                                {reconciling ? '⏳ Running...' : '🧪 Demo Run'}
                            </button>
                            <button className="btn btn-primary" onClick={() => runReconciliation(false)} disabled={reconciling || !store?.connections?.length}>
                                {reconciling ? '⏳ Reconciling...' : '▶ Run Reconciliation'}
                            </button>
                            {latestReport && (
                                <button className="btn btn-blue" onClick={() => window.open(`/api/stores/${id}/export-pdf`, '_blank')}>
                                    📄 Export PDF
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Loading skeleton during reconciliation */}
                    {reconciling && (
                        <div className="kpi-grid kpi-grid-4">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} height={100} />)}
                        </div>
                    )}

                    {!latestReport && !reconciling ? (
                        <EmptyState store={store} storeId={id} onTrySample={() => runReconciliation(true)} />
                    ) : latestReport && (
                        <>
                            {/* Primary KPI Cards */}
                            <div className="kpi-grid kpi-grid-4 animate-stagger">
                                <KPICard label="Phantom Revenue" value={formatCurrency(latestReport.phantomRevenue)} subtitle={`${latestReport.phantomPct}% overstated`} color="var(--c-red)" accentBorder />
                                <KPICard label="True ROAS" value={`${latestReport.trueRoas}×`} subtitle={`vs ${latestReport.adPlatform?.reportedRoas}× reported`} color="var(--c-green)" accentBorder />
                                <KPICard label="Net Revenue" value={formatCurrency(latestReport.shopify?.netRevenue)} subtitle="Shopify verified" />
                                <KPICard label="Total Ad Spend" value={formatCurrency(latestReport.adPlatform?.totalSpend)} subtitle="Across all channels" />
                            </div>

                            {/* Extended KPI Cards */}
                            {latestReport.kpis && latestReport.kpis.length > 0 && (
                                <div className="animate-stagger" style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                                    {latestReport.kpis.map(k => (
                                        <div key={k.key} className="card" style={{
                                            flex: '1 1 140px', minWidth: 140, textAlign: 'center',
                                            background: k.statusColor === 'green' ? 'var(--c-green-bg)' : k.statusColor === 'amber' ? 'var(--c-amber-light)' : 'var(--c-red-light)',
                                            border: `1px solid ${k.statusColor === 'green' ? 'var(--c-green-border)' : k.statusColor === 'amber' ? 'var(--c-amber-border)' : 'var(--c-red-border)'}`,
                                        }}>
                                            <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: k.statusColor === 'green' ? 'var(--c-green)' : k.statusColor === 'amber' ? 'var(--c-amber)' : 'var(--c-red)' }}>
                                                {k.format === 'currency' ? formatCurrency(k.value) : k.format === 'ratio' ? `${k.value}×` : `${k.value}%`}
                                            </div>
                                            <div className="text-xs text-muted" style={{ marginTop: 4 }}>{k.fullName}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Trend Chart + Gap Breakdown */}
                            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: trendData ? '2fr 1fr' : '1fr', gap: 16, marginBottom: 'var(--space-6)' }}>
                                {trendData && (
                                    <div className="card">
                                        <h3 className="font-semibold text-md" style={{ margin: '0 0 16px' }}>📈 Historical Trend</h3>
                                        <Line data={trendData} options={{
                                            responsive: true,
                                            plugins: { legend: { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } } },
                                            scales: {
                                                x: { ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 45 } },
                                                y: { title: { display: true, text: 'Phantom %', font: { size: 12 } }, beginAtZero: true, ticks: { font: { size: 11 } } },
                                                y1: { position: 'right', title: { display: true, text: 'True ROAS', font: { size: 12 } }, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } },
                                            },
                                        }} />
                                    </div>
                                )}
                                <div className="card">
                                    <h3 className="font-semibold text-md" style={{ margin: '0 0 16px' }}>💡 Gap Decomposition</h3>
                                    <Doughnut data={{
                                        labels: ['Discount Leak', 'Refund Leak', 'Chargebacks'],
                                        datasets: [{ data: [latestReport.gapBreakdown?.discountLeak || 0, latestReport.gapBreakdown?.refundLeak || 0, latestReport.gapBreakdown?.chargebacks || 0], backgroundColor: ['#f59e0b', '#dc2626', '#6b7280'] }],
                                    }} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 13, weight: '500' }, padding: 16, usePointStyle: true } } } }} />
                                </div>
                            </div>

                            {/* GA4 3-Way Reconciliation Panel */}
                            {latestReport.ga4 && (
                                <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-6)', border: '2px solid var(--c-indigo-border)' }}>
                                    <h3 className="font-semibold text-md" style={{ margin: '0 0 16px' }}>📊 3-Way Revenue Truth (Shopify × GA4 × Ad Platforms)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                        <div style={{ background: 'var(--c-blue-light)', borderRadius: 'var(--radius-lg)', padding: 16, textAlign: 'center' }}>
                                            <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', marginBottom: 8 }}>GA4 Agreement Score</div>
                                            <div style={{ fontSize: 36, fontWeight: 700, color: latestReport.ga4.ga4AgreementPct >= 90 ? 'var(--c-green)' : latestReport.ga4.ga4AgreementPct >= 70 ? 'var(--c-amber)' : 'var(--c-red)' }}>
                                                {latestReport.ga4.ga4AgreementPct}%
                                            </div>
                                            <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                                                {latestReport.ga4.ga4AgreementPct >= 90 ? '✅ GA4 closely matches Shopify' : latestReport.ga4.ga4AgreementPct >= 70 ? '⚠️ Notable difference — check tracking' : '🔴 Major discrepancy — tracking issue likely'}
                                            </div>
                                        </div>
                                        <div style={{ background: '#fefce8', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                                            <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', marginBottom: 10 }}>Revenue Trust Ranking</div>
                                            {latestReport.ga4.trustRanking?.map((t, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 2 ? '1px solid #fef3c7' : 'none' }}>
                                                    <div>
                                                        <span className="text-base font-semibold">{i + 1}. {t.source}</span>
                                                        <div className="text-xs text-muted">{t.label}</div>
                                                    </div>
                                                    <span className="text-md font-bold">{formatCurrency(t.revenue)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {latestReport.ga4.channelComparison?.length > 0 && (
                                        <div>
                                            <h4 className="text-base font-semibold" style={{ margin: '0 0 10px', color: 'var(--c-gray-700)' }}>Per-Channel: GA4 vs Ad Platform Claims</h4>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-base)' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid var(--c-indigo-border)', textAlign: 'left' }}>
                                                        <th style={{ padding: '8px 12px' }} className="text-muted font-semibold">Channel</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">GA4 Revenue</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">Ad Platform Claims</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">Inflation vs GA4</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">% of Shopify</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {latestReport.ga4.channelComparison.map((ch, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid var(--c-gray-100)' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{ch.channel}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(ch.ga4Revenue)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(ch.adPlatformRevenue)}</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: ch.inflationVsGA4 >= 1.5 ? 'var(--c-red)' : ch.inflationVsGA4 >= 1.2 ? 'var(--c-amber)' : 'var(--c-green)' }}>{ch.inflationVsGA4}×</td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted">{ch.shopifyShare}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="kpi-grid kpi-grid-4" style={{ marginTop: 16 }}>
                                        {[
                                            { label: 'GA4 Sessions', value: (latestReport.ga4.ga4Sessions || 0).toLocaleString() },
                                            { label: 'GA4 Transactions', value: (latestReport.ga4.ga4Transactions || 0).toLocaleString() },
                                            { label: 'GA4 Total Revenue', value: formatCurrency(latestReport.ga4.ga4Revenue) },
                                            { label: 'Ad Overstatement vs GA4', value: formatCurrency(latestReport.ga4.ga4AdGap), color: 'var(--c-red)' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ background: 'var(--c-gray-50)', borderRadius: 'var(--radius-lg)', padding: 12, textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: item.color || 'var(--c-gray-900)' }}>{item.value}</div>
                                                <div className="text-xs text-muted">{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Campaign Table — using shared CampaignTable component */}
                            <CampaignTable campaigns={filteredCampaigns} searchQuery={campaignSearch} onSearchChange={setCampaignSearch} formatCurrency={formatCurrency} />

                            {/* ⚡ ACTION ENGINE */}
                            {latestReport.optimizer && (
                                <div className="card animate-fade-in" style={{ border: '2px solid var(--c-gray-900)', marginBottom: 'var(--space-6)' }}>
                                    <div className="flex-between" style={{ marginBottom: 16 }}>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>⚡ Action Engine — Budget Optimizer</h3>
                                        <button className="btn btn-sm" style={{ background: 'var(--c-gray-900)', color: '#fff' }} onClick={handleExecuteAll} disabled={executing}>
                                            {executing ? '⏳ Executing...' : '🚀 Execute All Actions'}
                                        </button>
                                    </div>

                                    {/* Optimizer Summary */}
                                    <div className="kpi-grid animate-stagger" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 20 }}>
                                        {[
                                            { bg: 'var(--c-red-light)', value: latestReport.optimizer.summary.pauseCount, label: 'Pause', color: 'var(--c-red)' },
                                            { bg: 'var(--c-amber-light)', value: latestReport.optimizer.summary.reduceCount, label: 'Reduce', color: 'var(--c-amber)' },
                                            { bg: 'var(--c-green-bg)', value: latestReport.optimizer.summary.scaleCount, label: 'Scale', color: 'var(--c-green)' },
                                            { bg: '#ede9fe', value: formatCurrency(latestReport.optimizer.summary.freedBudget), label: 'Budget Freed', color: '#7c3aed' },
                                            { bg: '#ecfdf5', value: `${latestReport.optimizer.summary.projectedRoas}×`, label: 'Projected ROAS', color: 'var(--c-green)' },
                                            { bg: 'var(--c-green-bg)', value: `+${formatCurrency(latestReport.optimizer.summary.estimatedAdditionalRevenue)}`, label: 'Est. Revenue Gain', color: 'var(--c-green)', border: true },
                                        ].map((item, i) => (
                                            <div key={i} style={{ background: item.bg, borderRadius: 'var(--radius-lg)', padding: 12, textAlign: 'center', border: item.border ? '1px solid var(--c-green-border)' : 'none' }}>
                                                <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                                                <div className="text-xs text-muted">{item.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Cards */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {latestReport.optimizer.actions.map((a, i) => (
                                            <ActionCard key={i} action={a} onExecute={handleExecuteOne} executing={executingAction === a.campaignName} formatCurrency={formatCurrency} />
                                        ))}
                                    </div>

                                    {/* Execution Log */}
                                    {actionResults && (
                                        <div style={{ marginTop: 16, background: 'var(--c-gray-50)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
                                            <div className="text-base font-semibold" style={{ marginBottom: 8 }}>📋 Execution Log</div>
                                            {actionResults.map((r, i) => (
                                                <div key={i} className="text-sm" style={{ padding: '4px 0', color: r.status === 'failed' ? 'var(--c-red)' : 'var(--c-gray-700)' }}>{r.message}</div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Annual Impact */}
                                    {latestReport.optimizer.summary.estimatedAnnualImpact > 0 && (
                                        <KPICard label="Estimated Annual Impact of Optimization" value={`+${formatCurrency(latestReport.optimizer.summary.estimatedAnnualImpact)}`}
                                            subtitle={`Based on reallocating €${latestReport.optimizer.summary.freedBudget} from underperformers to proven winners`}
                                            color="#34d399" dark />
                                    )}
                                </div>
                            )}

                            {/* Report History */}
                            {deduplicatedReports.length > 0 && (
                                <div className="card animate-fade-in" style={{ marginTop: 'var(--space-6)' }}>
                                    <div className="flex-between" style={{ marginBottom: 16 }}>
                                        <h3 className="font-semibold text-md" style={{ margin: 0 }}>📋 Report History</h3>
                                        <span className="text-sm text-muted">Showing latest {deduplicatedReports.length} unique reports</span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-base)' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--c-gray-200)', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 12px' }} className="text-muted font-semibold">Date</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">Phantom %</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">True ROAS</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }} className="text-muted font-semibold">Net Revenue</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center' }} className="text-muted font-semibold">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deduplicatedReports.map((r, i) => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid var(--c-gray-100)', background: i === 0 ? 'var(--c-green-bg)' : 'transparent' }}>
                                                    <td style={{ padding: '8px 12px' }}>{new Date(r.createdAt).toLocaleString()}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--c-red)', fontWeight: 600 }}>{r.phantomPct}%</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--c-green)', fontWeight: 600 }}>{r.trueRoas}×</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(r.netRevenue)}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        <span className={`badge ${r.isDemo ? 'badge-gray' : 'badge-green'}`}>{r.isDemo ? 'Demo' : 'Live'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Back to Top */}
                {showBackToTop && (
                    <button className="no-print" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
                        position: 'fixed', bottom: 30, right: 30, zIndex: 100,
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--c-gray-900)', color: '#fff', border: 'none',
                        fontSize: 20, cursor: 'pointer', boxShadow: 'var(--shadow-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'opacity var(--transition-base)',
                    }}>↑</button>
                )}
            </div>
        </DashboardLayout>
    );
}
