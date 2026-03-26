// pages/dashboard/stores/[id]/settings.js
// Store connection settings — with manual credential fallback when OAuth is not configured

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const PLATFORMS = [
    {
        id: 'shopify', name: 'Shopify',
        description: 'Connect your Shopify store to pull order, revenue, and refund data.',
        color: '#16a34a', setup: 'oauth',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>,
        fields: [{ key: 'domain', label: 'Shopify Domain', placeholder: 'your-store.myshopify.com' }, { key: 'accessToken', label: 'Admin API Access Token', placeholder: 'shpat_...' }],
    },
    {
        id: 'meta', name: 'Meta Ads',
        description: 'Connect Meta (Facebook/Instagram) to pull campaign data and reported conversions.',
        color: '#2563eb', setup: 'oauth',
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
        fields: [{ key: 'accessToken', label: 'Access Token', placeholder: 'EAA...' }, { key: 'accountId', label: 'Ad Account ID', placeholder: 'act_123456789' }],
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
    const [manualModal, setManualModal] = useState(null); // platform id
    const [manualFields, setManualFields] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);
    useEffect(() => { if (session && id) fetchData(); }, [session, id]);

    useEffect(() => {
        const { connected } = router.query;
        if (connected) {
            setSuccessMsg(`${connected} connected successfully!`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }
    }, [router.query]);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const s = data.stores?.find(s => s.id === id);
            setStore(s);
            setConnections(s?.connections || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const initiateOAuth = async (platform) => {
        // Try OAuth first, fall back to manual if not configured
        try {
            const url = platform === 'shopify'
                ? `/api/oauth/shopify/install?storeId=${id}`
                : `/api/oauth/${platform}/connect?storeId=${id}`;

            const res = await fetch(url, { method: 'GET', redirect: 'manual' });

            // If the response is JSON with an error, OAuth is not configured
            if (res.type === 'opaqueredirect') {
                window.location.href = url;
                return;
            }

            const data = await res.json().catch(() => null);
            if (data?.error) {
                // OAuth not configured — open manual modal
                setManualModal(platform);
                setManualFields({});
                return;
            }

            // If we got a redirect URL
            if (data?.url) {
                window.location.href = data.url;
            } else {
                window.location.href = url;
            }
        } catch (err) {
            // Network error or OAuth not available — fall back to manual
            setManualModal(platform);
            setManualFields({});
        }
    };

    const handleManualConnect = async () => {
        if (!manualModal) return;
        const platform = PLATFORMS.find(p => p.id === manualModal);
        if (!platform) return;

        // Validate all fields filled
        const allFilled = platform.fields.every(f => manualFields[f.key]?.trim());
        if (!allFilled) return;

        setSaving(true);
        try {
            await fetch(`/api/stores/${id}/connections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: manualModal, credentials: manualFields }),
            });
            setSuccessMsg(`${platform.name} connected successfully!`);
            setTimeout(() => setSuccessMsg(''), 5000);
            setManualModal(null);
            setManualFields({});
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const getConnectionStatus = (platformId) => connections.find(c => c.platform === platformId);

    if (status === 'loading' || loading) {
        return <DashboardLayout title="Settings — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout title={`Settings — ${store?.name || 'Store'} — Calyxra`}>
            <div className="container" style={{ maxWidth: 720 }}>
                {successMsg && <div className="alert-success">{successMsg}</div>}

                {/* Breadcrumb */}
                <div style={{ marginBottom: 8 }}>
                    <a href={`/dashboard/stores/${id}`} style={{ color: 'var(--c-gray-500)', fontSize: 13, textDecoration: 'none' }}>
                        &larr; Back to {store?.name}
                    </a>
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: 'var(--c-gray-900)', letterSpacing: '-0.02em' }}>Platform Connections</h1>
                <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24 }}>Connect your platforms to enable automated reconciliation.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PLATFORMS.map(p => {
                        const conn = getConnectionStatus(p.id);
                        const isConnected = conn?.status === 'connected';

                        return (
                            <div key={p.id} className="card" style={{ padding: '18px 20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 10,
                                            background: `${p.color}10`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: p.color, flexShrink: 0,
                                        }}>{p.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--c-gray-800)', fontSize: 15 }}>{p.name}</div>
                                            <div style={{ color: 'var(--c-gray-500)', fontSize: 13, marginTop: 2 }}>{p.description}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {isConnected ? (
                                            <>
                                                <span className="badge badge-green" style={{ gap: 4 }}>
                                                    <span className="status-dot status-dot-green" style={{ width: 6, height: 6 }} /> Connected
                                                </span>
                                                <button onClick={() => initiateOAuth(p.id)} className="btn btn-ghost btn-xs">Reconnect</button>
                                            </>
                                        ) : (
                                            <button onClick={() => initiateOAuth(p.id)} className="btn btn-primary btn-sm">Connect</button>
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

                {/* Manual fallback note */}
                <div style={{ marginTop: 24, padding: 18, background: 'var(--c-gray-50)', borderRadius: 12, border: '1px dashed var(--c-gray-200)' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-700)' }}>Manual connection</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--c-gray-500)', lineHeight: 1.5 }}>
                        If OAuth is unavailable, click Connect and enter your API credentials manually. You can also use the{' '}
                        <a href="/dashboard/stores/add" style={{ color: '#064E3B', fontWeight: 500 }}>setup wizard</a> for guided onboarding.
                    </p>
                </div>
            </div>

            {/* Manual Credential Modal */}
            {manualModal && (() => {
                const platform = PLATFORMS.find(p => p.id === manualModal);
                if (!platform) return null;
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setManualModal(null)} />
                        <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, padding: 28, zIndex: 1 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--c-gray-900)' }}>Connect {platform.name}</h3>
                            <p style={{ color: 'var(--c-gray-500)', fontSize: 13, marginBottom: 20 }}>
                                Enter your API credentials manually. Your data is encrypted with AES-256.
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
