// pages/dashboard/stores/[id].js
// Store Dashboard — redesigned with premium SaaS styling
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

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
    const [agencyTier, setAgencyTier] = useState(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [isDemoPreview, setIsDemoPreview] = useState(false);
    const topRef = useRef(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);
    useEffect(() => { if (session && id) fetchStoreData(); }, [session, id]);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 600);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const showToast = (message, type = 'success') => setToast({ message, type });
    const formatCurrency = (val) => '$' + (val || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const res = await fetch(`/api/stores/${id}/export-pdf`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Export failed');
            }
            const html = await res.text();
            // Use hidden iframe so styles from <head> are preserved
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:1200px;border:none;';
            document.body.appendChild(iframe);
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
            // Wait for fonts and content to load
            await new Promise(resolve => {
                iframe.onload = resolve;
                setTimeout(resolve, 2000); // fallback timeout
            });
            // Remove print button and scripts
            iframeDoc.querySelectorAll('script, .no-print').forEach(el => el.remove());
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: `${store?.name || 'Store'}_Reconciliation_Report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            }).from(iframeDoc.body).save();
            document.body.removeChild(iframe);
            showToast('PDF downloaded!');
        } catch (err) {
            showToast(err.message || 'PDF export failed', 'error');
        }
        setExportingPdf(false);
    };

    const fetchStoreData = async ({ skipReport } = {}) => {
        try {
            const storesRes = await fetch('/api/stores');
            const storesData = await storesRes.json();
            setStore(storesData.stores?.find(s => s.id === id));
            // Clean up old demo + duplicate reports from DB
            await fetch(`/api/stores/${id}/reports`, { method: 'DELETE' }).catch(() => {});
            const reportsRes = await fetch(`/api/stores/${id}/reports`);
            const reportsData = await reportsRes.json();
            setReports(reportsData.reports || []);
            // Only set latestReport if not in demo mode (skipReport prevents overwriting demo data)
            if (!skipReport && reportsData.reports?.length > 0) {
                setLatestReport(JSON.parse(reportsData.reports[0].fullReport));
            }
            try {
                const agencyRes = await fetch('/api/agency');
                const agencyData = await agencyRes.json();
                setAgencyTier(agencyData.tier || 'free');
            } catch { setAgencyTier('free'); }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const runReconciliation = async (useSample = false) => {
        // 1. Immediately clear ALL previous state to prevent contamination
        setLatestReport(null);
        setIsDemoPreview(false);
        setError('');
        setActionResults(null);
        setExecutingAction(null);
        setCampaignSearch('');
        setReconciling(true);

        try {
            const res = await fetch(`/api/stores/${id}/reconcile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useSampleData: useSample }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // 2. Set mode flag BEFORE setting data so render is consistent
            setIsDemoPreview(useSample);
            setLatestReport(data.report);

            // 3. Only refetch store data for live runs (demo runs don't save to DB)
            if (!useSample) {
                await fetchStoreData();
            }

            // Show warnings from the API
            if (data.warnings?.length > 0) {
                const warningMsgs = data.warnings.filter(w => w.type === 'warning').map(w => w.message);
                if (warningMsgs.length > 0) {
                    showToast(warningMsgs[0], 'warning');
                    return;
                }
            }
            showToast(useSample ? 'Demo preview loaded (not saved)' : 'Reconciliation complete!');
        } catch (err) { setError(err.message); showToast('Reconciliation failed: ' + err.message, 'error'); }
        finally { setReconciling(false); }
    };

    const handleExecuteAll = () => {
        const actions = latestReport?.optimizer?.actions || [];
        const pauseCount = actions.filter(a => a.action === 'PAUSE').length;
        setConfirmModal({
            title: 'Execute All Optimizer Actions?',
            message: `This will execute ${actions.length} campaign actions${pauseCount > 0 ? ` including ${pauseCount} campaign pause(s)` : ''}. This action modifies your live ad accounts.`,
            details: actions.map(a => `${a.action}: ${a.campaignName} (${a.channel}) — ${formatCurrency(a.currentSpend)} → ${formatCurrency(a.recommendedSpend)}`).join('\n'),
            confirmLabel: 'Execute All', danger: pauseCount > 0,
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
            title: `${action.action === 'PAUSE' ? 'Pause' : action.action === 'REDUCE' ? 'Reduce' : 'Scale'} Campaign?`,
            message: `${action.action} "${action.campaignName}" on ${action.channel}.\n${action.reason}`,
            details: `Budget: ${formatCurrency(action.currentSpend)} → ${formatCurrency(action.recommendedSpend)} · True ROAS: ${action.trueRoas}×`,
            confirmLabel: action.action === 'PAUSE' ? 'Pause Campaign' : action.action === 'REDUCE' ? 'Reduce Budget' : 'Scale Budget',
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
        return (
            <DashboardLayout title="Store — Calyxra">
                <div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div>
            </DashboardLayout>
        );
    }

    const filteredCampaigns = (latestReport?.campaigns || []).filter(c =>
        !campaignSearch || c.campaignName?.toLowerCase().includes(campaignSearch.toLowerCase()) || c.channel?.toLowerCase().includes(campaignSearch.toLowerCase())
    );

    // Server already returns deduped (1 per day, max 10, live only)
    const deduplicatedReports = reports;

    const trendData = deduplicatedReports.length > 1 ? {
        labels: deduplicatedReports.slice().reverse().map(r => new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
        datasets: [{
            label: 'Phantom Revenue %', data: deduplicatedReports.slice().reverse().map(r => r.phantomPct),
            borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.06)', fill: true, tension: 0.4,
            borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#ef4444',
        }, {
            label: 'True ROAS', data: deduplicatedReports.slice().reverse().map(r => r.trueRoas),
            borderColor: '#064E3B', backgroundColor: 'rgba(16, 185, 129, 0.06)', fill: true, tension: 0.4,
            yAxisID: 'y1', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#064E3B',
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
                    <div className="flex-between animate-fade-in" style={{ marginBottom: 24, paddingTop: 8 }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--c-gray-900)', letterSpacing: '-0.02em' }}>{store?.name}</h1>
                            {dateRange && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-gray-400)' }}>Report period: {dateRange}</p>}
                        </div>
                        <div className="flex-gap-2 no-print">
                            <button className="btn btn-outline btn-sm" onClick={() => runReconciliation(true)} disabled={reconciling}>
                                {reconciling ? 'Running...' : 'Demo Run'}
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => runReconciliation(false)} disabled={reconciling || !store?.connections?.length}>
                                {reconciling ? 'Reconciling...' : 'Run Reconciliation'}
                            </button>
                            {latestReport && (
                                agencyTier === 'free' ? (
                                    <button className="btn btn-secondary btn-sm" disabled title="Available on paid plans" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                        Export PDF
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary btn-sm" onClick={handleExportPdf} disabled={exportingPdf}>
                                        {exportingPdf ? 'Generating...' : 'Export PDF'}
                                    </button>
                                )
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
                            {/* Demo banner */}
                            {isDemoPreview && (
                                <div className="animate-fade-in" style={{
                                    padding: '12px 20px', marginBottom: 16, borderRadius: 10,
                                    background: '#fffbeb', border: '1px solid #fde68a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>
                                        This is a <strong>demo preview</strong> with sample data. It is not saved to your report history.
                                    </span>
                                    <button className="btn btn-sm btn-outline" style={{ fontSize: 12, padding: '4px 12px' }}
                                        onClick={() => { setIsDemoPreview(false); setLatestReport(null); }}>
                                        Dismiss demo
                                    </button>
                                </div>
                            )}

                            {/* Primary KPI Cards — ALWAYS visible to show the problem */}
                            <div className="kpi-grid animate-stagger" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                                <KPICard
                                    label="Phantom Revenue"
                                    value={formatCurrency(latestReport.phantomRevenue)}
                                    subtitle={`${latestReport.phantomPct}% overstated`}
                                    color="#ef4444"
                                    tint="#fef2f2"
                                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                                />
                                <KPICard
                                    label="True ROAS"
                                    value={`${latestReport.trueRoas}×`}
                                    subtitle={`vs ${latestReport.adPlatform?.reportedRoas}× reported`}
                                    color="#064E3B"
                                    tint="#ECFDF5"
                                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                                />
                                <KPICard
                                    label="Net Revenue"
                                    value={formatCurrency(latestReport.shopify?.netRevenue)}
                                    subtitle="Shopify verified"
                                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
                                />
                                <KPICard label="Gross Revenue" value={formatCurrency(latestReport.shopify?.grossRevenue)} subtitle="Before deductions" />
                                <KPICard label="Total Ad Spend" value={formatCurrency(latestReport.adPlatform?.totalSpend)} subtitle="Across all channels" />
                            </div>

                            {/* Free tier — show enough to prove the problem, then upsell */}
                            {agencyTier === 'free' ? (
                                <div style={{ marginTop: 8 }}>
                                    {/* Revenue Leak Alert — hard-hitting insight */}
                                    <div className="card animate-fade-in" style={{
                                        marginBottom: 20, padding: 24,
                                        background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 50%, #fefce8 100%)',
                                        border: '1px solid #fecaca',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 12,
                                                background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#991b1b' }}>
                                                    Your ad platforms are overstating revenue by {latestReport.phantomPct}%
                                                </h3>
                                                <p style={{ margin: 0, fontSize: 14, color: '#7f1d1d', lineHeight: 1.5 }}>
                                                    That&apos;s <strong>{formatCurrency(latestReport.phantomRevenue)}</strong> in phantom revenue this period alone.
                                                    At this rate, you&apos;re losing approximately <strong>{formatCurrency(Math.round((latestReport.phantomRevenue || 0) * 12))}/year</strong> in misattributed spend.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gap Breakdown — visible, shows WHERE the money leaks */}
                                    <div className="card animate-fade-in" style={{ marginBottom: 20, padding: 24 }}>
                                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--c-gray-900)' }}>Where Your Revenue Leaks</h3>
                                        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--c-gray-500)' }}>Breakdown of the gap between reported and actual revenue</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                            {[
                                                { label: 'Refund Leak', value: latestReport.gapBreakdown?.refundLeak || 0, color: '#ef4444', bg: '#fef2f2', icon: '↩' },
                                                { label: 'Discount Leak', value: latestReport.gapBreakdown?.discountLeak || 0, color: '#f59e0b', bg: '#fffbeb', icon: '%' },
                                                { label: 'Chargebacks', value: latestReport.gapBreakdown?.chargebacks || 0, color: '#6366f1', bg: '#eef2ff', icon: '⚡' },
                                            ].map((item, i) => (
                                                <div key={i} style={{
                                                    padding: 20, borderRadius: 12, background: item.bg,
                                                    border: `1px solid ${item.color}20`, textAlign: 'center',
                                                }}>
                                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                                                    <div style={{ fontSize: 22, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                                                        {formatCurrency(item.value)}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--c-gray-500)', fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reported vs Actual comparison — visual proof */}
                                    <div className="card animate-fade-in" style={{ marginBottom: 20, padding: 24 }}>
                                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--c-gray-900)' }}>Reported vs Actual Revenue</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-gray-600)' }}>Ad Platform Reports</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-gray-800)' }}>{formatCurrency(latestReport.adPlatform?.reportedRevenue || latestReport.shopify?.grossRevenue)}</span>
                                                </div>
                                                <div style={{ height: 32, borderRadius: 8, background: '#fee2e2', position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, #fecaca, #fecaca 10px, #fee2e2 10px, #fee2e2 20px)', borderRadius: 8 }} />
                                                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Inflated</div>
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-gray-600)' }}>Shopify Verified</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#043927' }}>{formatCurrency(latestReport.shopify?.netRevenue)}</span>
                                                </div>
                                                <div style={{
                                                    height: 32, borderRadius: 8, background: '#064E3B',
                                                    width: `${Math.min(100, Math.round(((latestReport.shopify?.netRevenue || 0) / (latestReport.adPlatform?.reportedRevenue || latestReport.shopify?.grossRevenue || 1)) * 100))}%`,
                                                }} />
                                            </div>
                                        </div>
                                        <div style={{
                                            marginTop: 16, padding: 12, borderRadius: 8, background: '#fef2f2',
                                            border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8,
                                        }}>
                                            <span style={{ fontSize: 16 }}>💸</span>
                                            <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
                                                <strong>{formatCurrency(latestReport.phantomRevenue)}</strong> gap — this is money you <em>think</em> you earned but didn&apos;t
                                            </span>
                                        </div>
                                    </div>

                                    {/* Blurred advanced sections + CTA */}
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
                                            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                                                {['MER', 'Net Profit', 'CAC', 'LTV:CAC', 'AOV', 'Ad Efficiency'].map(l => (
                                                    <div key={l} className="card" style={{ textAlign: 'center', padding: 14 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--c-gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                                                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-gray-300)' }}>--</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="card" style={{ height: 140, marginBottom: 16 }} />
                                            <div className="card" style={{ height: 120 }} />
                                        </div>
                                        <div style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                            textAlign: 'center', zIndex: 10, background: 'rgba(255,255,255,0.97)', borderRadius: 20,
                                            padding: '36px 52px', boxShadow: '0 12px 48px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
                                            maxWidth: 440,
                                        }}>
                                            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #064E3B, #043927)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                            </div>
                                            <p style={{ fontWeight: 700, fontSize: 20, color: 'var(--c-gray-900)', margin: '0 0 6px' }}>Get the full picture</p>
                                            <p style={{ fontSize: 13, color: 'var(--c-gray-500)', margin: '0 0 6px', lineHeight: 1.5 }}>
                                                Campaign-level analysis, action engine, trend monitoring, PDF reports & white-label
                                            </p>
                                            <ul style={{ textAlign: 'left', margin: '16px 0 20px', padding: 0, listStyle: 'none', fontSize: 13, color: 'var(--c-gray-700)' }}>
                                                {[
                                                    'Per-campaign True ROAS breakdown',
                                                    'AI budget optimizer (pause/scale/reduce)',
                                                    'Monthly trend tracking & alerts',
                                                    'White-label PDF reports for clients',
                                                ].map((item, i) => (
                                                    <li key={i} style={{ padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#064E3B" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                            <a href="https://calyxra.com/#pricing" className="btn btn-primary" style={{
                                                textDecoration: 'none', padding: '12px 32px', fontSize: 15, fontWeight: 700,
                                                background: 'linear-gradient(135deg, #064E3B, #043927)',
                                                display: 'inline-block', borderRadius: 10,
                                            }}>
                                                Upgrade — $150/month
                                            </a>
                                            <p style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 10, marginBottom: 0 }}>Cancel anytime · Setup in 2 minutes</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <>
                            {/* Extended KPI Cards */}
                            {latestReport.kpis && latestReport.kpis.length > 0 && (
                                <div className="animate-stagger" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                                    {latestReport.kpis.map(k => (
                                        <div key={k.key} className="card" style={{
                                            flex: '1 1 140px', minWidth: 140, textAlign: 'center',
                                            background: k.statusColor === 'green' ? '#ECFDF5' : k.statusColor === 'amber' ? '#fffbeb' : '#fef2f2',
                                            border: `1px solid ${k.statusColor === 'green' ? '#A7F3D0' : k.statusColor === 'amber' ? '#fde68a' : '#fecaca'}`,
                                        }}>
                                            <div style={{ fontSize: 11, color: 'var(--c-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
                                            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: k.statusColor === 'green' ? '#043927' : k.statusColor === 'amber' ? '#b45309' : '#dc2626' }}>
                                                {k.format === 'currency' ? formatCurrency(k.value) : k.format === 'ratio' ? `${k.value}×` : `${k.value}%`}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 4 }}>{k.fullName}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Trend Chart + Gap Breakdown */}
                            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: (!isDemoPreview && trendData) ? '5fr 2fr' : '1fr', gap: 16, marginBottom: 24 }}>
                                {!isDemoPreview && trendData && (
                                    <div className="card">
                                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--c-gray-900)', letterSpacing: '-0.01em' }}>Historical Trend</h3>
                                        <Line data={trendData} options={{
                                            responsive: true,
                                            plugins: {
                                                legend: {
                                                    position: 'top',
                                                    labels: { font: { size: 12, family: 'Inter' }, usePointStyle: true, pointStyleWidth: 8, boxHeight: 6, padding: 16 },
                                                },
                                                tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12, family: 'Inter' }, bodyFont: { size: 12, family: 'Inter' }, padding: 10, cornerRadius: 8 },
                                            },
                                            scales: {
                                                x: { ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', maxRotation: 45, minRotation: 45 }, grid: { display: false } },
                                                y: { title: { display: true, text: 'Phantom %', font: { size: 11, family: 'Inter' }, color: '#94a3b8' }, beginAtZero: true, ticks: { font: { size: 11 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
                                                y1: { position: 'right', title: { display: true, text: 'True ROAS', font: { size: 11, family: 'Inter' }, color: '#94a3b8' }, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
                                            },
                                        }} />
                                    </div>
                                )}
                                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--c-gray-900)', letterSpacing: '-0.01em', alignSelf: 'flex-start' }}>Gap Decomposition</h3>
                                    <div style={{ maxWidth: 180, width: '100%', margin: '0 auto' }}>
                                        <Doughnut data={{
                                            labels: ['Discount Leak', 'Refund Leak', 'Chargebacks'],
                                            datasets: [{ data: [latestReport.gapBreakdown?.discountLeak || 0, latestReport.gapBreakdown?.refundLeak || 0, latestReport.gapBreakdown?.chargebacks || 0], backgroundColor: ['#f59e0b', '#ef4444', '#94a3b8'], borderWidth: 0, borderRadius: 4 }],
                                        }} options={{
                                            responsive: true,
                                            maintainAspectRatio: true,
                                            cutout: '62%',
                                            plugins: {
                                                legend: { position: 'bottom', labels: { font: { size: 11, weight: '500', family: 'Inter' }, padding: 10, usePointStyle: true, pointStyleWidth: 8, boxHeight: 6 } },
                                                tooltip: { backgroundColor: '#0f172a', titleFont: { size: 12, family: 'Inter' }, bodyFont: { size: 12, family: 'Inter' }, padding: 10, cornerRadius: 8 },
                                            },
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* GA4 3-Way Reconciliation Panel */}
                            {latestReport.ga4 && (
                                <div className="card animate-fade-in" style={{ marginBottom: 24, border: '1px solid #c7d2fe' }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--c-gray-900)', letterSpacing: '-0.01em' }}>3-Way Revenue Truth (Shopify × GA4 × Ad Platforms)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                        <div style={{ background: '#eff6ff', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--c-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>GA4 Agreement Score</div>
                                            <div style={{
                                                fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                                color: latestReport.ga4.ga4AgreementPct >= 90 ? '#043927' : latestReport.ga4.ga4AgreementPct >= 70 ? '#b45309' : '#dc2626',
                                            }}>
                                                {latestReport.ga4.ga4AgreementPct}%
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--c-gray-500)', marginTop: 4 }}>
                                                {latestReport.ga4.ga4AgreementPct >= 90 ? 'GA4 closely matches Shopify' : latestReport.ga4.ga4AgreementPct >= 70 ? 'Notable difference — check tracking' : 'Major discrepancy — tracking issue likely'}
                                            </div>
                                        </div>
                                        <div style={{ background: '#fefce8', borderRadius: 12, padding: 20 }}>
                                            <div style={{ fontSize: 11, color: 'var(--c-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Revenue Trust Ranking</div>
                                            {latestReport.ga4.trustRanking?.map((t, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid #fef3c7' : 'none' }}>
                                                    <div>
                                                        <span style={{ fontSize: 14, fontWeight: 600 }}>{i + 1}. {t.source}</span>
                                                        <div style={{ fontSize: 12, color: 'var(--c-gray-400)' }}>{t.label}</div>
                                                    </div>
                                                    <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(t.revenue)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {latestReport.ga4.channelComparison?.length > 0 && (
                                        <div>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: 'var(--c-gray-700)' }}>Per-Channel: GA4 vs Ad Platform Claims</h4>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Channel</th>
                                                        <th style={{ textAlign: 'right' }}>GA4 Revenue</th>
                                                        <th style={{ textAlign: 'right' }}>Ad Platform Claims</th>
                                                        <th style={{ textAlign: 'right' }}>Inflation vs GA4</th>
                                                        <th style={{ textAlign: 'right' }}>% of Shopify</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {latestReport.ga4.channelComparison.map((ch, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 500 }}>{ch.channel}</td>
                                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(ch.ga4Revenue)}</td>
                                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(ch.adPlatformRevenue)}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600, color: ch.inflationVsGA4 >= 1.5 ? '#dc2626' : ch.inflationVsGA4 >= 1.2 ? '#b45309' : '#043927' }}>{ch.inflationVsGA4}×</td>
                                                            <td style={{ textAlign: 'right', color: 'var(--c-gray-400)' }}>{ch.shopifyShare}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
                                        {[
                                            { label: 'GA4 Sessions', value: (latestReport.ga4.ga4Sessions || 0).toLocaleString() },
                                            { label: 'GA4 Transactions', value: (latestReport.ga4.ga4Transactions || 0).toLocaleString() },
                                            { label: 'GA4 Total Revenue', value: formatCurrency(latestReport.ga4.ga4Revenue) },
                                            { label: 'Ad Overstatement vs GA4', value: formatCurrency(latestReport.ga4.ga4AdGap), color: '#dc2626' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ background: 'var(--c-gray-50)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color || 'var(--c-gray-900)' }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 2 }}>{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Campaign Table */}
                            <CampaignTable campaigns={filteredCampaigns} searchQuery={campaignSearch} onSearchChange={setCampaignSearch} formatCurrency={formatCurrency} />

                            {/* ACTION ENGINE */}
                            {latestReport.optimizer && (
                                <div className="card animate-fade-in" style={{ marginBottom: 24, border: '1px solid var(--c-gray-900)' }}>
                                    <div className="flex-between" style={{ marginBottom: 16 }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--c-gray-900)', letterSpacing: '-0.01em' }}>Action Engine</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--c-gray-500)' }}>Budget optimizer recommendations</p>
                                        </div>
                                        <button className="btn btn-sm" style={{ background: 'var(--c-gray-900)', color: '#fff' }} onClick={handleExecuteAll} disabled={executing}>
                                            {executing ? 'Executing...' : 'Execute All Actions'}
                                        </button>
                                    </div>

                                    {/* Optimizer Summary */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
                                        {[
                                            { bg: '#fef2f2', value: latestReport.optimizer.summary.pauseCount, label: 'Pause', color: '#ef4444' },
                                            { bg: '#fffbeb', value: latestReport.optimizer.summary.reduceCount, label: 'Reduce', color: '#f59e0b' },
                                            { bg: '#ECFDF5', value: latestReport.optimizer.summary.scaleCount, label: 'Scale', color: '#064E3B' },
                                            { bg: '#f5f3ff', value: formatCurrency(latestReport.optimizer.summary.freedBudget), label: 'Budget Freed', color: '#7c3aed' },
                                            { bg: '#ECFDF5', value: `${latestReport.optimizer.summary.projectedRoas}×`, label: 'Projected ROAS', color: '#043927' },
                                            { bg: '#ECFDF5', value: `+${formatCurrency(latestReport.optimizer.summary.estimatedAdditionalRevenue)}`, label: 'Est. Revenue Gain', color: '#043927', border: true },
                                        ].map((item, i) => (
                                            <div key={i} style={{
                                                background: item.bg, borderRadius: 10, padding: 12, textAlign: 'center',
                                                border: item.border ? '1px solid #A7F3D0' : 'none',
                                            }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--c-gray-400)' }}>{item.label}</div>
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
                                        <div style={{ marginTop: 16, background: 'var(--c-gray-50)', borderRadius: 10, padding: 14 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--c-gray-800)' }}>Execution Log</div>
                                            {actionResults.map((r, i) => (
                                                <div key={i} style={{ fontSize: 13, padding: '4px 0', color: r.status === 'failed' ? '#ef4444' : 'var(--c-gray-700)' }}>{r.message}</div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Annual Impact */}
                                    {latestReport.optimizer.summary.estimatedAnnualImpact > 0 && (
                                        <div style={{
                                            marginTop: 16, padding: 16, borderRadius: 10,
                                            background: 'linear-gradient(135deg, #ECFDF5, #ecfdf5)',
                                            border: '1px solid #A7F3D0',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: 11, color: '#043927', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Estimated Annual Impact</div>
                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#043927', fontVariantNumeric: 'tabular-nums' }}>+{formatCurrency(latestReport.optimizer.summary.estimatedAnnualImpact)}</div>
                                            <div style={{ fontSize: 12, color: 'var(--c-gray-500)', marginTop: 4 }}>Based on reallocating ${latestReport.optimizer.summary.freedBudget} from underperformers to proven winners</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Report History — hidden during demo preview */}
                            {!isDemoPreview && deduplicatedReports.length > 0 && (
                                <div className="card animate-fade-in" style={{ marginTop: 24 }}>
                                    <div className="flex-between" style={{ marginBottom: 16 }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--c-gray-900)', letterSpacing: '-0.01em' }}>Report History</h3>
                                        <span style={{ fontSize: 12, color: 'var(--c-gray-400)' }}>Showing latest {deduplicatedReports.length} unique reports</span>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th style={{ textAlign: 'right' }}>Phantom %</th>
                                                <th style={{ textAlign: 'right' }}>True ROAS</th>
                                                <th style={{ textAlign: 'right' }}>Net Revenue</th>
                                                <th style={{ textAlign: 'center' }}>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deduplicatedReports.map((r, i) => (
                                                <tr key={r.id} style={{ background: i === 0 ? '#ECFDF5' : undefined }}>
                                                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.phantomPct}%</td>
                                                    <td style={{ textAlign: 'right', color: '#064E3B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.trueRoas}×</td>
                                                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.netRevenue)}</td>
                                                    <td style={{ textAlign: 'center' }}>
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
                        </>
                    )}
                </div>

                {/* Back to Top */}
                {showBackToTop && (
                    <button className="no-print" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
                        position: 'fixed', bottom: 30, right: 30, zIndex: 100,
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--c-gray-900)', color: '#fff', border: 'none',
                        fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms',
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                )}
            </div>
        </DashboardLayout>
    );
}
