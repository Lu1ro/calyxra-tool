// pages/dashboard/stores/[id]/analytics.js
// Embedded Analytics — BI Dashboard management with proper empty/coming soon states

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const DEMO_DASHBOARDS = [
    { id: 'looker_recon', name: 'Reconciliation Layer', type: 'looker', defaultUrl: '' },
    { id: 'looker_exec', name: 'Executive KPI', type: 'looker', defaultUrl: '' },
    { id: 'powerbi_customer', name: 'Customer Analytics', type: 'powerbi', defaultUrl: '' },
    { id: 'powerbi_channel', name: 'Channel Spend', type: 'powerbi', defaultUrl: '' },
];

const ALLOWED_DOMAINS = ['lookerstudio.google.com', 'app.powerbi.com', 'tableau.com'];

export default function EmbeddedAnalytics() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [dashboards, setDashboards] = useState([]);
    const [selectedDash, setSelectedDash] = useState(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [newDashName, setNewDashName] = useState('');
    const [newDashUrl, setNewDashUrl] = useState('');
    const [urlError, setUrlError] = useState('');

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);
    useEffect(() => { if (session && id) fetchStore(); }, [session, id]);

    const fetchStore = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const s = data.stores?.find(st => st.id === id);
            setStore(s);
            let savedDashboards = [];
            if (s?.analyticsConfig) {
                try { savedDashboards = JSON.parse(s.analyticsConfig); } catch (err) {}
            }
            if (savedDashboards.length === 0) savedDashboards = DEMO_DASHBOARDS;
            setDashboards(savedDashboards);
            if (savedDashboards.length > 0) setSelectedDash(savedDashboards[0]);
        } catch (e) { console.error(e); }
    };

    const handleSaveDashboards = async (newDashboards) => {
        setDashboards(newDashboards);
        try {
            await fetch(`/api/stores/${id}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analyticsConfig: JSON.stringify(newDashboards) }),
            });
        } catch (e) { console.error(e); }
    };

    const validateUrl = (url) => {
        try {
            const urlObj = new URL(url);
            return ALLOWED_DOMAINS.some(d => urlObj.hostname === d || urlObj.hostname.endsWith('.' + d));
        } catch { return false; }
    };

    const handleAddDashboard = () => {
        if (!newDashName || !newDashUrl) return;
        if (!validateUrl(newDashUrl)) {
            setUrlError('Only Looker Studio, PowerBI, and Tableau URLs are allowed.');
            return;
        }
        setUrlError('');
        const newDash = { id: 'dash_' + Date.now(), name: newDashName, url: newDashUrl, type: newDashUrl.includes('powerbi') ? 'powerbi' : 'looker' };
        const updated = [...dashboards, newDash];
        handleSaveDashboards(updated);
        setNewDashName('');
        setNewDashUrl('');
        setSelectedDash(newDash);
        setIsConfiguring(false);
    };

    const handleRemoveDashboard = (dashId) => {
        const updated = dashboards.filter(d => d.id !== dashId);
        handleSaveDashboards(updated);
        if (selectedDash?.id === dashId && updated.length > 0) setSelectedDash(updated[0]);
        else if (updated.length === 0) setSelectedDash(null);
    };

    const handleUpdateUrl = (dashId, url) => {
        const updated = dashboards.map(d => d.id === dashId ? { ...d, url } : d);
        handleSaveDashboards(updated);
        if (selectedDash?.id === dashId) setSelectedDash({ ...selectedDash, url });
    };

    if (status === 'loading') {
        return <DashboardLayout title="Analytics — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    const hasRealUrl = selectedDash?.url && selectedDash.url.startsWith('https://') && validateUrl(selectedDash.url);

    return (
        <DashboardLayout title={`BI Dashboards — ${store?.name || 'Store'} — Calyxra`}>
            <div className="container" style={{ maxWidth: 1100 }}>
                {/* Breadcrumb */}
                <div style={{ marginBottom: 8 }}>
                    <a href={`/dashboard/stores/${id}`} style={{ color: 'var(--c-gray-500)', fontSize: 13, textDecoration: 'none' }}>&larr; Back to {store?.name}</a>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--c-gray-900)', letterSpacing: '-0.02em' }}>BI Dashboards</h1>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginTop: 4 }}>Embed your Looker Studio or Power BI dashboards</p>
                    </div>
                    <button onClick={() => setIsConfiguring(!isConfiguring)} className={`btn ${isConfiguring ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                        {isConfiguring ? 'Done' : 'Configure'}
                    </button>
                </div>

                {/* Dashboard Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
                    {dashboards.map(dash => (
                        <button key={dash.id} onClick={() => setSelectedDash(dash)}
                            style={{
                                padding: '8px 16px', borderRadius: 8, fontSize: 13, border: 'none',
                                background: selectedDash?.id === dash.id ? '#ECFDF5' : '#fff',
                                color: selectedDash?.id === dash.id ? '#166534' : 'var(--c-gray-600)',
                                fontWeight: selectedDash?.id === dash.id ? 600 : 500, cursor: 'pointer',
                                boxShadow: selectedDash?.id === dash.id ? 'inset 0 0 0 1.5px #a7f3d0' : 'inset 0 0 0 1px var(--c-gray-200)',
                                transition: 'all 150ms', whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            {dash.type === 'powerbi' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            )}
                            {dash.name}
                            {isConfiguring && (
                                <span onClick={(e) => { e.stopPropagation(); handleRemoveDashboard(dash.id); }}
                                    style={{ color: '#ef4444', cursor: 'pointer', marginLeft: 4, fontSize: 11 }}>
                                    &times;
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Add Dashboard (when configuring) */}
                {isConfiguring && (
                    <div className="card" style={{ marginBottom: 20, padding: 18 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--c-gray-800)' }}>Add Dashboard</h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input value={newDashName} onChange={e => setNewDashName(e.target.value)}
                                placeholder="Dashboard name" className="input" style={{ flex: '1 1 140px', minWidth: 140 }} />
                            <input value={newDashUrl} onChange={e => { setNewDashUrl(e.target.value); setUrlError(''); }}
                                placeholder="https://lookerstudio.google.com/embed/..." className="input" style={{ flex: '2 1 240px', minWidth: 240 }} />
                            <button onClick={handleAddDashboard} className="btn btn-primary btn-sm" disabled={!newDashName || !newDashUrl}>Add</button>
                        </div>
                        {urlError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{urlError}</p>}
                        <p style={{ color: 'var(--c-gray-400)', fontSize: 12, marginTop: 8 }}>Allowed: Looker Studio, PowerBI, Tableau embed URLs only.</p>
                    </div>
                )}

                {/* Dashboard Content */}
                {selectedDash ? (
                    hasRealUrl ? (
                        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 600 }}>
                            <iframe src={selectedDash.url} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title={selectedDash.name} />
                        </div>
                    ) : (
                        /* Coming Soon / Not configured state */
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '60px 40px', textAlign: 'center', background: 'linear-gradient(180deg, var(--c-gray-50) 0%, #fff 100%)' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16,
                                    background: selectedDash.type === 'powerbi' ? '#fff7ed' : '#ECFDF5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    {selectedDash.type === 'powerbi' ? (
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
                                    ) : (
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#064E3B" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                    )}
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>{selectedDash.name}</h3>
                                <p style={{ color: 'var(--c-gray-500)', fontSize: 14, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
                                    Connect your {selectedDash.type === 'powerbi' ? 'Power BI' : 'Looker Studio'} dashboard to see reconciliation data in your preferred BI tool.
                                </p>

                                {isConfiguring ? (
                                    <div style={{ maxWidth: 400, margin: '0 auto' }}>
                                        <input
                                            value={selectedDash.url || ''}
                                            onChange={e => handleUpdateUrl(selectedDash.id, e.target.value)}
                                            placeholder={`Paste your ${selectedDash.type === 'powerbi' ? 'Power BI' : 'Looker Studio'} embed URL`}
                                            className="input" style={{ width: '100%', textAlign: 'center' }}
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => setIsConfiguring(true)} className="btn btn-primary">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9"/></svg>
                                        Configure Dashboard
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14 }}>No dashboards configured. Click &quot;Configure&quot; to add one.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
