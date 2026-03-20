// pages/dashboard/stores/[id]/settings.js
// Store connection settings — manage OAuth-based platform connections

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const GREEN = '#00b894';
const PLATFORMS = [
    {
        id: 'shopify',
        name: 'Shopify',
        icon: '🛍️',
        description: 'Connect your Shopify store to pull order, revenue, and refund data.',
        color: '#95bf47',
        setup: 'oauth',
    },
    {
        id: 'meta',
        name: 'Meta Ads',
        icon: '📘',
        description: 'Connect Meta (Facebook/Instagram) to pull campaign data and reported conversions.',
        color: '#1877f2',
        setup: 'oauth',
    },
    {
        id: 'google',
        name: 'Google Ads',
        icon: '🔍',
        description: 'Connect Google Ads to pull PMax, Search, Shopping campaign data.',
        color: '#4285f4',
        setup: 'oauth',
    },
    {
        id: 'tiktok',
        name: 'TikTok Ads',
        icon: '🎵',
        description: 'Connect TikTok for Business to pull campaign metrics.',
        color: '#000000',
        setup: 'oauth',
    },
];

export default function StoreSettings() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shopDomain, setShopDomain] = useState('');
    const [showShopifyInput, setShowShopifyInput] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    useEffect(() => {
        if (session && id) fetchData();
    }, [session, id]);

    useEffect(() => {
        // Check for success query params
        const { connected } = router.query;
        if (connected) {
            setSuccessMsg(`✅ ${connected} connected successfully!`);
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const initiateOAuth = (platform) => {
        if (platform === 'shopify') {
            if (!shopDomain) {
                setShowShopifyInput(true);
                return;
            }
            window.location.href = `/api/oauth/shopify/install?shop=${encodeURIComponent(shopDomain)}&storeId=${id}`;
        } else {
            window.location.href = `/api/oauth/${platform}/connect?storeId=${id}`;
        }
    };

    const connectShopify = () => {
        if (!shopDomain) return;
        window.location.href = `/api/oauth/shopify/install?shop=${encodeURIComponent(shopDomain)}&storeId=${id}`;
    };

    const getConnectionStatus = (platformId) => {
        return connections.find(c => c.platform === platformId);
    };

    if (status === 'loading' || loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
    }

    return (
        <>
            <Head>
                <title>Settings — {store?.name || 'Store'} — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href={`/dashboard/stores/${id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← {store?.name}</a>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>Settings</span>
                    </div>
                </div>

                <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
                    {successMsg && (
                        <div style={{ background: '#d1fae5', color: GREEN, padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, fontWeight: 500 }}>{successMsg}</div>
                    )}

                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, margin: '0 0 8px' }}>Platform Connections</h1>
                    <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Connect your platforms to enable automated reconciliation. One click — we handle the rest.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {PLATFORMS.map(p => {
                            const conn = getConnectionStatus(p.id);
                            const isConnected = conn?.status === 'connected';

                            return (
                                <div key={p.id} style={{
                                    background: '#fff', borderRadius: 12, padding: 20,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    border: isConnected ? `2px solid ${GREEN}` : '2px solid transparent',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 10,
                                                background: `${p.color}15`, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: 22,
                                            }}>{p.icon}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{p.name}</div>
                                                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{p.description}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {isConnected ? (
                                                <>
                                                    <span style={{
                                                        fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                                        background: '#d1fae5', color: GREEN, fontWeight: 600,
                                                    }}>✓ Connected</span>
                                                    <button
                                                        onClick={() => initiateOAuth(p.id)}
                                                        style={{
                                                            padding: '6px 12px', background: '#f3f4f6', border: 'none',
                                                            borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#6b7280',
                                                        }}
                                                    >Reconnect</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => initiateOAuth(p.id)}
                                                    style={{
                                                        padding: '8px 18px', background: p.color, color: '#fff',
                                                        border: 'none', borderRadius: 8, fontSize: 13,
                                                        fontWeight: 600, cursor: 'pointer',
                                                    }}
                                                >Connect {p.name}</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shopify domain input */}
                                    {p.id === 'shopify' && showShopifyInput && !isConnected && (
                                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                            <input
                                                type="text"
                                                value={shopDomain}
                                                onChange={e => setShopDomain(e.target.value)}
                                                placeholder="your-store.myshopify.com"
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: 6,
                                                    border: '1px solid #d1d5db', fontSize: 13,
                                                    fontFamily: "'Inter', sans-serif",
                                                }}
                                            />
                                            <button
                                                onClick={connectShopify}
                                                disabled={!shopDomain}
                                                style={{
                                                    padding: '8px 16px', background: '#95bf47', color: '#fff',
                                                    border: 'none', borderRadius: 6, fontSize: 13,
                                                    fontWeight: 600, cursor: 'pointer',
                                                    opacity: shopDomain ? 1 : 0.5,
                                                }}
                                            >Connect</button>
                                        </div>
                                    )}

                                    {isConnected && conn.lastSyncAt && (
                                        <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                                            Last synced: {new Date(conn.lastSyncAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Manual connection fallback */}
                    <div style={{ marginTop: 32, padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#374151' }}>💡 Don't have OAuth credentials yet?</h3>
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                            You can still use the <a href={`/dashboard/stores/add`} style={{ color: GREEN, fontWeight: 500 }}>manual connection wizard</a> to
                            enter API keys directly. OAuth is recommended for production — it's more secure and handles token refresh automatically.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
