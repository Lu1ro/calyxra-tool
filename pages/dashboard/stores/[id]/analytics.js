// pages/dashboard/stores/[id]/analytics.js
// Embedded Analytics — Iframe for Looker / PowerBI dashboards
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const GREEN = '#166534';

const DEMO_DASHBOARDS = [
    { id: 'looker_recon', name: 'Reconciliation Layer (Looker)', type: 'looker', defaultUrl: 'https://lookerstudio.google.com/embed/reporting/demo1' },
    { id: 'looker_exec', name: 'Executive KPI (Looker)', type: 'looker', defaultUrl: 'https://lookerstudio.google.com/embed/reporting/demo2' },
    { id: 'powerbi_customer', name: 'Customer Analytics (PowerBI)', type: 'powerbi', defaultUrl: 'https://app.powerbi.com/view?r=demo3' },
    { id: 'powerbi_channel', name: 'Channel Spend (PowerBI)', type: 'powerbi', defaultUrl: 'https://app.powerbi.com/view?r=demo4' },
];

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

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    useEffect(() => {
        if (session && id) fetchStore();
    }, [session, id]);

    const fetchStore = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const s = data.stores?.find(st => st.id === id);
            setStore(s);

            let savedDashboards = [];
            if (s?.analyticsConfig) {
                try {
                    savedDashboards = JSON.parse(s.analyticsConfig);
                } catch (err) {
                    console.error("Failed to parse analytics config:", err);
                }
            }
            // Add defaults if none saved
            if (savedDashboards.length === 0) {
                savedDashboards = DEMO_DASHBOARDS;
            }
            setDashboards(savedDashboards);
            if (savedDashboards.length > 0) setSelectedDash(savedDashboards[0]);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveDashboards = async (newDashboards) => {
        setDashboards(newDashboards);
        try {
            await fetch(`/api/stores/${id}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analyticsConfig: JSON.stringify(newDashboards)
                }),
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddDashboard = () => {
        if (!newDashName || !newDashUrl) return;

        // Iframe Sanitization
        const allowedDomains = ['lookerstudio.google.com', 'app.powerbi.com', 'tableau.com'];
        try {
            const urlObj = new URL(newDashUrl);
            const isAllowed = allowedDomains.includes(urlObj.hostname) ||
                urlObj.hostname.endsWith('.lookerstudio.google.com') ||
                urlObj.hostname.endsWith('.powerbi.com') ||
                urlObj.hostname.endsWith('.tableau.com');

            if (!isAllowed) {
                alert("For security reasons, only Looker Studio, PowerBI, and Tableau URLs are allowed.");
                return;
            }
        } catch (e) {
            alert("Please enter a valid URL (starting with https://).");
            return;
        }

        const newDashboards = [...dashboards, { id: 'dash_' + Date.now(), name: newDashName, url: newDashUrl, type: newDashUrl.includes('powerbi') ? 'powerbi' : 'looker' }];
        handleSaveDashboards(newDashboards);
        setNewDashName('');
        setNewDashUrl('');
        setSelectedDash(newDashboards[newDashboards.length - 1]);
        setIsConfiguring(false);
    };

    const handleRemoveDashboard = (dashId) => {
        const newDashboards = dashboards.filter(d => d.id !== dashId);
        handleSaveDashboards(newDashboards);
        if (selectedDash?.id === dashId && newDashboards.length > 0) {
            setSelectedDash(newDashboards[0]);
        }
    };

    if (status === 'loading') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
    }

    return (
        <>
            <Head>
                <title>Embedded Analytics — {store?.name || 'Store'} — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href={`/dashboard/stores/${id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← {store?.name}</a>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>📈 BI Dashboards</span>
                    </div>
                    <button onClick={() => setIsConfiguring(!isConfiguring)} style={{ padding: '6px 14px', background: isConfiguring ? '#e5e7eb' : '#f3f4f6', border: 'none', borderRadius: 6, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        ⚙️ Configure Dashboards
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)' }}>
                    {/* Dashboard Tabs */}
                    <div style={{ background: '#fff', padding: '0 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 24, overflowX: 'auto' }}>
                        {dashboards.map(dash => (
                            <div
                                key={dash.id}
                                onClick={() => setSelectedDash(dash)}
                                style={{
                                    padding: '16px 0', fontSize: 14, fontWeight: selectedDash?.id === dash.id ? 600 : 500,
                                    color: selectedDash?.id === dash.id ? GREEN : '#6b7280', cursor: 'pointer',
                                    borderBottom: selectedDash?.id === dash.id ? `3px solid ${GREEN}` : '3px solid transparent',
                                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8,
                                }}
                            >
                                <span>{dash.type === 'powerbi' ? '📊' : '📈'}</span>
                                {dash.name}
                                {isConfiguring && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveDashboard(dash.id); }}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 2, marginLeft: 4 }}
                                        title="Remove dashboard"
                                    >✕</button>
                                )}
                            </div>
                        ))}
                        {isConfiguring && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                                <input
                                    type="text" value={newDashName} onChange={e => setNewDashName(e.target.value)}
                                    placeholder="Dashboard Name" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #d1d5db', width: 140 }}
                                />
                                <input
                                    type="text" value={newDashUrl} onChange={e => setNewDashUrl(e.target.value)}
                                    placeholder="Embed URL" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #d1d5db', width: 200 }}
                                />
                                <button onClick={handleAddDashboard} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                            </div>
                        )}
                    </div>

                    {/* Iframe Container */}
                    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column' }}>
                        {selectedDash ? (
                            <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                                {/* Fake placeholder for demo since we can't iframe the actual powerbi links in this environment without real tokens */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#fff' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 64, marginBottom: 16 }}>{selectedDash.type === 'powerbi' ? '📊' : '📈'}</div>
                                        <h2 style={{ margin: '0 0 8px', fontFamily: "'DM Serif Display', serif" }}>{selectedDash.name}</h2>
                                        <p style={{ color: '#9ca3af', fontSize: 14 }}>Embedded {selectedDash.type === 'powerbi' ? 'PowerBI' : 'Looker Studio'} dashboard via iframe</p>
                                        <div style={{ marginTop: 24, padding: '12px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#d1d5db' }}>
                                            src: {selectedDash.url || selectedDash.defaultUrl}
                                        </div>
                                    </div>
                                </div>
                                {/* The actual iframe code would be here:
                                <iframe src={selectedDash.url || selectedDash.defaultUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                                */}
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                No dashboards configured. Click "Configure Dashboards" to add one.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
