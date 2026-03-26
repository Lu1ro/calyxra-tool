// pages/dashboard/reports.js
// Reports — list of all reconciliation reports across stores
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Skeleton from '@/components/Skeleton';

export default function ReportsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agencyTier, setAgencyTier] = useState(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);

    useEffect(() => {
        if (session) {
            fetchReports();
            fetch('/api/agency').then(r => r.json()).then(d => setAgencyTier(d.tier || 'free')).catch(() => setAgencyTier('free'));
        }
    }, [session]);

    const fetchReports = async () => {
        try {
            const storesRes = await fetch('/api/stores');
            const storesData = await storesRes.json();
            const storeList = storesData.stores || [];

            const allReports = [];
            for (const store of storeList) {
                try {
                    const res = await fetch(`/api/stores/${store.id}/reports`);
                    const data = await res.json();
                    (data.reports || []).forEach(r => {
                        allReports.push({ ...r, storeName: store.name, storeId: store.id });
                    });
                } catch (e) { /* skip */ }
            }

            allReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setReports(allReports);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async (storeId, storeName) => {
        if (agencyTier === 'free') return;
        try {
            const res = await fetch(`/api/stores/${storeId}/export-pdf`);
            if (!res.ok) throw new Error('Export failed');
            const html = await res.text();
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:1200px;border:none;';
            document.body.appendChild(iframe);
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();
            await new Promise(resolve => {
                iframe.onload = resolve;
                setTimeout(resolve, 2000);
            });
            iframeDoc.querySelectorAll('script, .no-print').forEach(el => el.remove());
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: `${storeName}_Report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            }).from(iframeDoc.body).save();
            document.body.removeChild(iframe);
        } catch (err) {
            console.error('PDF export failed:', err);
        }
    };

    const fmt = v => '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
    const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (status === 'loading' || status === 'unauthenticated') {
        return <DashboardLayout title="Reports — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout title="Reports — Calyxra">
            <div className="container" style={{ maxWidth: 1000 }}>
                <div className="animate-fade-in" style={{ paddingTop: 8, marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-gray-900)', margin: 0, letterSpacing: '-0.02em' }}>Reports</h1>
                    <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginTop: 4 }}>All reconciliation reports across your stores</p>
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                        <Skeleton height={60} /><Skeleton height={60} /><Skeleton height={60} /><Skeleton height={60} />
                    </div>
                ) : reports.length === 0 ? (
                    <div className="card animate-fade-in" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-400)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>No reports yet</h2>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24 }}>Run a reconciliation on any store to generate your first report.</p>
                        <button className="btn btn-primary" onClick={() => router.push('/dashboard/stores')}>Go to Stores</button>
                    </div>
                ) : (
                    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--c-gray-100)', background: 'var(--c-gray-50)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phantom %</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>True ROAS</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Revenue</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--c-gray-500)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((r, i) => (
                                    <tr key={r.id}
                                        style={{
                                            borderBottom: '1px solid var(--c-gray-50)',
                                            cursor: 'pointer',
                                            transition: 'background 150ms',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--c-gray-50)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => router.push(`/dashboard/stores/${r.storeId}`)}
                                    >
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--c-gray-800)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 7,
                                                    background: 'linear-gradient(135deg, #ECFDF5, #dcfce7)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0, color: '#166534',
                                                }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                                </div>
                                                {r.storeName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--c-gray-500)' }}>
                                            <div>{fmtDate(r.createdAt)}</div>
                                            <div style={{ fontSize: 11, color: 'var(--c-gray-400)' }}>{fmtTime(r.createdAt)}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.phantomPct}%</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#064E3B', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.trueRoas}&times;</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.netRevenue)}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span className={`badge ${r.isDemo ? 'badge-gray' : 'badge-green'}`} style={{ fontSize: 10 }}>{r.isDemo ? 'Demo' : 'Live'}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                            {agencyTier === 'free' ? (
                                                <span style={{ color: 'var(--c-gray-300)', fontSize: 11 }} title="Upgrade to export PDF">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleExportPdf(r.storeId, r.storeName)}
                                                    style={{
                                                        background: 'none', border: '1px solid var(--c-gray-200)', borderRadius: 6,
                                                        padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                                        color: 'var(--c-gray-600)', transition: 'all 150ms', fontFamily: 'var(--font-sans)',
                                                    }}
                                                    onMouseEnter={e => { e.target.style.borderColor = '#064E3B'; e.target.style.color = '#064E3B'; }}
                                                    onMouseLeave={e => { e.target.style.borderColor = 'var(--c-gray-200)'; e.target.style.color = 'var(--c-gray-600)'; }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px', marginRight: 4 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                    PDF
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ height: 32 }} />
            </div>
        </DashboardLayout>
    );
}
