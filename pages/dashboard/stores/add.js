// pages/dashboard/stores/add.js
// Add Store Wizard — OAuth-first approach for a real SaaS experience
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';

const GREEN = '#064E3B';

export default function AddStorePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [storeName, setStoreName] = useState('');
    const [storeDomain, setStoreDomain] = useState('');
    const [storeId, setStoreId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState([]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    // Handle return from OAuth — check URL params
    useEffect(() => {
        const { storeId: qsStoreId, connected, step: qsStep } = router.query;
        if (qsStoreId) {
            setStoreId(qsStoreId);
            // Fetch current connections for this store
            fetchConnections(qsStoreId);
            setStep(parseInt(qsStep) || 2);
        }
        if (connected) {
            setConnectedPlatforms(prev =>
                prev.includes(connected) ? prev : [...prev, connected]
            );
        }
    }, [router.query]);

    const fetchConnections = async (sid) => {
        try {
            const res = await fetch(`/api/stores/${sid}/connections`);
            const data = await res.json();
            if (data.connections) {
                const platforms = data.connections
                    .filter(c => c.status === 'connected')
                    .map(c => c.platform);
                setConnectedPlatforms(platforms);
            }
            // Also fetch store info for display
            const storeRes = await fetch(`/api/stores`);
            const storeData = await storeRes.json();
            const store = storeData.stores?.find(s => s.id === sid);
            if (store) {
                setStoreName(store.name);
                setStoreDomain(store.domain);
            }
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        }
    };

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: storeName, domain: storeDomain }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStoreId(data.store.id);
            setStep(2);
            // Update URL so OAuth can return here
            router.replace(`/dashboard/stores/add?storeId=${data.store.id}&step=2`, undefined, { shallow: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const connectShopify = () => {
        const domain = storeDomain.trim();
        if (!domain) return;
        // Redirect to Shopify OAuth install — uses Partner App
        window.location.href = `/api/oauth/shopify/install?shop=${encodeURIComponent(domain)}&storeId=${storeId}&returnTo=wizard`;
    };

    const connectMeta = () => {
        // Redirect to Meta OAuth — uses Facebook Login
        window.location.href = `/api/oauth/meta/connect?storeId=${storeId}&returnTo=wizard`;
    };

    if (status === 'loading' || status === 'unauthenticated') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
    }

    return (
        <>
            <Head>
                <title>Add Store — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Back nav */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px' }}>
                    <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← Back to Dashboard</a>
                </div>

                <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
                    {/* Progress */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                flex: 1, height: 4, borderRadius: 2,
                                background: s <= step ? GREEN : '#e5e7eb',
                                transition: 'background 0.3s',
                            }} />
                        ))}
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                            {error}
                        </div>
                    )}

                    {/* Step 1: Store Info */}
                    {step === 1 && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Add a New Store</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Enter your Shopify store details to get started.</p>
                            <form onSubmit={handleCreateStore}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Store Name</label>
                                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} required
                                        placeholder="e.g. My Brand" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Shopify Domain</label>
                                    <input type="text" value={storeDomain} onChange={e => setStoreDomain(e.target.value)} required
                                        placeholder="your-store.myshopify.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <button type="submit" disabled={loading}
                                    style={{ width: '100%', padding: '12px 0', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'Creating...' : 'Continue →'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Connect Platforms via OAuth */}
                    {step === 2 && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Connect Your Platforms</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                                One-click connect — no API keys needed. We request read-only access.
                            </p>

                            {/* Shopify OAuth */}
                            <div style={{
                                border: connectedPlatforms.includes('shopify') ? '2px solid #16a34a' : '1px solid #e5e7eb',
                                borderRadius: 12, padding: 20, marginBottom: 12,
                                background: connectedPlatforms.includes('shopify') ? '#f0fdf4' : '#fff',
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: connectedPlatforms.includes('shopify') ? '#dcfce7' : 'linear-gradient(135deg, #96bf48, #5c8e2a)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {connectedPlatforms.includes('shopify') ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>Shopify</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Orders, revenue, refunds, discounts</div>
                                        </div>
                                    </div>
                                    {connectedPlatforms.includes('shopify') ? (
                                        <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                            Connected
                                        </span>
                                    ) : (
                                        <button onClick={connectShopify}
                                            style={{
                                                padding: '8px 20px', background: '#5c8e2a', color: '#fff',
                                                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#4a7a22'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#5c8e2a'}
                                        >
                                            Connect Shopify →
                                        </button>
                                    )}
                                </div>
                                {!connectedPlatforms.includes('shopify') && (
                                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>
                                        You'll be redirected to Shopify to authorize read-only access to your store.
                                    </p>
                                )}
                            </div>

                            {/* Meta Ads OAuth */}
                            <div style={{
                                border: connectedPlatforms.includes('meta') ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                borderRadius: 12, padding: 20, marginBottom: 12,
                                background: connectedPlatforms.includes('meta') ? '#eff6ff' : '#fff',
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: connectedPlatforms.includes('meta') ? '#dbeafe' : 'linear-gradient(135deg, #1877f2, #0d5bbd)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {connectedPlatforms.includes('meta') ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>Meta Ads</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Facebook & Instagram ad spend, ROAS</div>
                                        </div>
                                    </div>
                                    {connectedPlatforms.includes('meta') ? (
                                        <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                            Connected
                                        </span>
                                    ) : (
                                        <button onClick={connectMeta}
                                            style={{
                                                padding: '8px 20px', background: '#1877f2', color: '#fff',
                                                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#0d5bbd'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#1877f2'}
                                        >
                                            Connect Meta →
                                        </button>
                                    )}
                                </div>
                                {!connectedPlatforms.includes('meta') && (
                                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>
                                        You'll be redirected to Facebook to authorize read-only access to your ad accounts.
                                    </p>
                                )}
                            </div>

                            {/* Google Ads info */}
                            <div style={{
                                border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16,
                                background: '#fafafa',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: '#f3f4f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: '#6b7280' }}>Google Ads</div>
                                        <div style={{ fontSize: 12, color: '#9ca3af' }}>Available in Store Settings after setup</div>
                                    </div>
                                </div>
                            </div>

                            {/* Security note */}
                            <div style={{ background: '#ECFDF5', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#064E3B' }}>
                                🔒 We only request <strong>read-only</strong> access. Your data is encrypted with AES-256 at rest.
                            </div>

                            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                                💡 Ad platforms are optional. You can connect them later in Store Settings.
                            </p>

                            <button
                                onClick={() => connectedPlatforms.includes('shopify') ? setStep(3) : null}
                                disabled={!connectedPlatforms.includes('shopify')}
                                style={{
                                    width: '100%', padding: '12px 0',
                                    background: connectedPlatforms.includes('shopify') ? GREEN : '#d1d5db',
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                                    cursor: connectedPlatforms.includes('shopify') ? 'pointer' : 'not-allowed',
                                }}>
                                {connectedPlatforms.length >= 2 ? 'Continue →' : connectedPlatforms.includes('shopify') ? 'Continue with Shopify only →' : 'Connect Shopify to continue'}
                            </button>

                            {/* Skip option */}
                            {!connectedPlatforms.includes('shopify') && storeId && (
                                <button onClick={() => router.push(`/dashboard/stores/${storeId}`)}
                                    style={{
                                        width: '100%', padding: '10px 0', marginTop: 8,
                                        background: 'none', color: '#6b7280', border: 'none',
                                        fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
                                    }}>
                                    Skip for now — connect later in Settings
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 3: Done */}
                    {step === 3 && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Store Connected!</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
                                <strong>{storeName || 'Your store'}</strong> is ready. Run your first reconciliation to find phantom revenue.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
                                {connectedPlatforms.map(p => (
                                    <span key={p} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                        background: p === 'shopify' ? '#dcfce7' : p === 'meta' ? '#dbeafe' : '#fef3c7',
                                        color: p === 'shopify' ? '#166534' : p === 'meta' ? '#1d4ed8' : '#92400e',
                                    }}>
                                        ✓ {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </span>
                                ))}
                            </div>
                            <button onClick={() => router.push(`/dashboard/stores/${storeId}`)}
                                style={{ padding: '12px 24px', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                View Store Dashboard →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
