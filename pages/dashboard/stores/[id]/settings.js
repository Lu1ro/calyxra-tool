// pages/dashboard/stores/[id]/settings.js
// Store connection settings — Shopify, Meta (free), Google Ads (paid)

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StoreNavbar from '@/components/StoreNavbar';

const PLATFORMS = [
    {
        id: 'shopify', name: 'Shopify', tier: 'free',
        description: 'Connect your Shopify store to pull order, revenue, and refund data.',
        color: '#16a34a',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
        fields: [
            { key: 'domain', label: 'Shopify Domain', placeholder: 'your-store.myshopify.com' },
            { key: 'apiKey', label: 'Admin API Access Token', placeholder: 'shpat_...' },
        ],
    },
    {
        id: 'meta', name: 'Meta Ads', tier: 'free',
        description: 'Connect Meta (Facebook/Instagram) to pull campaign spend and reported conversions.',
        color: '#2563eb',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
        fields: [
            { key: 'accessToken', label: 'Access Token', placeholder: 'EAA...' },
            { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_123456789' },
        ],
    },
    {
        id: 'google', name: 'Google Ads', tier: 'paid',
        description: 'Connect Google Ads via OAuth to pull campaign spend and purchase conversions.',
        color: '#ea4335',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
        oauth: true, // Uses OAuth flow, not manual credentials
        fields: [], // No manual fields — OAuth only
    },
];

export default function StoreSettings() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [manualModal, setManualModal] = useState(null);
    const [manualFields, setManualFields] = useState({});
    const [saving, setSaving] = useState(false);
    const [agencyTier, setAgencyTier] = useState(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);
    useEffect(() => { if (session && id) fetchData(); }, [session, id]);

    useEffect(() => {
        const { connected, error } = router.query;
        if (connected) {
            setSuccessMsg(`${connected} connected successfully!`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }
        if (error) {
            setErrorMsg(`Connection failed: ${error.replace(/_/g, ' ')}`);
            setTimeout(() => setErrorMsg(''), 5000);
        }
    }, [router.query]);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const s = data.stores?.find(s => s.id === id);
            setStore(s);
            setConnections(s?.connections || []);
            try {
                const agencyRes = await fetch('/api/agency');
                const agencyData = await agencyRes.json();
                setAgencyTier(agencyData.tier || 'free');
            } catch { setAgencyTier('free'); }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const connectPlatform = async (platform) => {
        // Google Ads uses OAuth flow
        if (platform.oauth) {
            window.location.href = `/api/oauth/google/connect?storeId=${id}`;
            return;
        }

        // Other platforms: try OAuth first, fall back to manual
        try {
            const url = platform.id === 'shopify'
                ? `/api/oauth/shopify/install?storeId=${id}`
                : `/api/oauth/${platform.id}/connect?storeId=${id}`;

            const res = await fetch(url, { method: 'GET', redirect: 'manual' });

            if (res.type === 'opaqueredirect') {
                window.location.href = url;
                return;
            }

            const data = await res.json().catch(() => null);
            if (data?.error) {
                setManualModal(platform.id);
                setManualFields({});
                return;
            }

            if (data?.url) {
                window.location.href = data.url;
            } else {
                window.location.href = url;
            }
        } catch {
            setManualModal(platform.id);
            setManualFields({});
        }
    };

    const handleManualConnect = async () => {
        if (!manualModal) return;
        const platform = PLATFORMS.find(p => p.id === manualModal);
        if (!platform) return;

        const allFilled = platform.fields.every(f => manualFields[f.key]?.trim());
        if (!allFilled) return;

        setSaving(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/stores/${id}/connections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: manualModal, credentials: manualFields }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'Connection failed');
            } else {
                setSuccessMsg(`${platform.name} connected successfully!`);
                setTimeout(() => setSuccessMsg(''), 5000);
                setManualModal(null);
                setManualFields({});
                fetchData();
            }
        } catch (err) {
            setErrorMsg('Connection failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getConnectionStatus = (platformId) => connections.find(c => c.platform === platformId);

    const isPaid = agencyTier && agencyTier !== 'free';

    if (status === 'loading' || loading) {
        return <DashboardLayout title="Settings — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout title={`Settings — ${store?.name || 'Store'} — Calyxra`}>
            <StoreNavbar store={store} storeId={id} currentPage={`/dashboard/stores/${id}/settings`} />

            <div className="container" style={{ maxWidth: 720 }}>
                {successMsg && <div className="alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}
                {errorMsg && <div className="alert-error" style={{ marginBottom: 16 }}>{errorMsg}</div>}

                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '16px 0 4px', color: 'var(--c-gray-900)', letterSpacing: '-0.02em' }}>Platform Connections</h1>
                <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24 }}>Connect your platforms to enable automated reconciliation.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PLATFORMS.map(p => {
                        const conn = getConnectionStatus(p.id);
                        const isConnected = conn?.status === 'connected';
                        const isLocked = p.tier === 'paid' && !isPaid;

                        return (
                            <div key={p.id} className="card" style={{
                                padding: '18px 20px',
                                opacity: isLocked ? 0.7 : 1,
                                position: 'relative',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 10,
                                            background: `${p.color}10`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: p.color, flexShrink: 0,
                                        }}>{p.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--c-gray-800)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {p.name}
                                                {p.tier === 'paid' && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: '2px 6px',
                                                        borderRadius: 4, background: 'linear-gradient(135deg, #064E3B, #043927)',
                                                        color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    }}>PRO</span>
                                                )}
                                                {p.oauth && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 600, padding: '2px 6px',
                                                        borderRadius: 4, background: '#eff6ff', color: '#2563eb',
                                                    }}>OAuth</span>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--c-gray-500)', fontSize: 13, marginTop: 2 }}>{p.description}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {isLocked ? (
                                            <a href="https://calyxra.com/#pricing" className="btn btn-sm"
                                                style={{
                                                    textDecoration: 'none', background: 'linear-gradient(135deg, #064E3B, #043927)',
                                                    color: '#fff', fontSize: 12,
                                                }}>
                                                Upgrade to connect
                                            </a>
                                        ) : isConnected ? (
                                            <>
                                                <span className="badge badge-green" style={{ gap: 4 }}>
                                                    <span className="status-dot status-dot-green" style={{ width: 6, height: 6 }} /> Connected
                                                </span>
                                                <button onClick={() => connectPlatform(p)} className="btn btn-ghost btn-xs">Reconnect</button>
                                            </>
                                        ) : (
                                            <button onClick={() => connectPlatform(p)} className="btn btn-primary btn-sm">Connect</button>
                                        )}
                                    </div>
                                </div>

                                {isConnected && conn.lastSyncAt && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-gray-400)' }}>
                                        Last synced: {timeAgo(conn.lastSyncAt)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Info box */}
                <div style={{ marginTop: 24, padding: 18, background: 'var(--c-gray-50)', borderRadius: 12, border: '1px dashed var(--c-gray-200)' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-700)' }}>How connections work</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--c-gray-500)', lineHeight: 1.5 }}>
                        All credentials are encrypted at rest. Google Ads uses OAuth for secure one-click login.
                        Meta uses access tokens entered manually.
                        You can reconnect anytime to update credentials.
                    </p>
                </div>
            </div>

            {/* Manual Credential Modal */}
            {manualModal && (() => {
                const platform = PLATFORMS.find(p => p.id === manualModal);
                if (!platform || !platform.fields.length) return null;
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setManualModal(null)} />
                        <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, padding: 28, zIndex: 1 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--c-gray-900)' }}>Connect {platform.name}</h3>
                            <p style={{ color: 'var(--c-gray-500)', fontSize: 13, marginBottom: 20 }}>
                                Enter your API credentials. All data is encrypted at rest.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {platform.fields.map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-gray-700)', marginBottom: 4 }}>{f.label}</label>
                                        <input
                                            type={f.key.toLowerCase().includes('token') || f.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                                            value={manualFields[f.key] || ''}
                                            onChange={e => setManualFields({ ...manualFields, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            className="input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                                <button onClick={() => setManualModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
                                <button onClick={handleManualConnect} className="btn btn-primary btn-sm" disabled={saving || !platform.fields.every(f => manualFields[f.key]?.trim())}>
                                    {saving ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </DashboardLayout>
    );
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
