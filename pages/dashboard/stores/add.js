// pages/dashboard/stores/add.js
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';

const GREEN = '#00b894';

export default function AddStorePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: store info, 2: connect platforms, 3: done
    const [storeName, setStoreName] = useState('');
    const [storeDomain, setStoreDomain] = useState('');
    const [storeId, setStoreId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Platform credentials
    const [shopifyKey, setShopifyKey] = useState('');
    const [metaToken, setMetaToken] = useState('');
    const [metaAccountId, setMetaAccountId] = useState('');
    const [googleToken, setGoogleToken] = useState('');
    const [googleCustomerId, setGoogleCustomerId] = useState('');
    const [tiktokToken, setTiktokToken] = useState('');
    const [tiktokAdvertiserId, setTiktokAdvertiserId] = useState('');
    const [connectedPlatforms, setConnectedPlatforms] = useState([]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

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
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const [connecting, setConnecting] = useState('');

    const connectPlatform = async (platform, credentials) => {
        setError('');
        setConnecting(platform);
        try {
            const res = await fetch(`/api/stores/${storeId}/connections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, credentials }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConnectedPlatforms([...connectedPlatforms, platform]);
        } catch (err) {
            setError(err.message);
        } finally {
            setConnecting('');
        }
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
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
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
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Enter the Shopify store details for your client.</p>
                            <form onSubmit={handleCreateStore}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Store Name</label>
                                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} required
                                        placeholder="e.g. Abhishek's Brand" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Shopify Domain</label>
                                    <input type="text" value={storeDomain} onChange={e => setStoreDomain(e.target.value)} required
                                        placeholder="store.myshopify.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
                                </div>
                                <button type="submit" disabled={loading}
                                    style={{ width: '100%', padding: '12px 0', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'Creating...' : 'Continue →'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Connect Platforms */}
                    {step === 2 && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Connect Platforms</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Connect at least Shopify + one ad platform.</p>

                            {/* Shopify */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: connectedPlatforms.includes('shopify') ? 0 : 12 }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>🟢 Shopify</span>
                                    {connectedPlatforms.includes('shopify') && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>✓ Connected</span>}
                                </div>
                                {!connectedPlatforms.includes('shopify') && (
                                    <>
                                        <input type="text" value={shopifyKey} onChange={e => setShopifyKey(e.target.value)} placeholder="shpat_... (Admin API Access Token)"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <button onClick={() => connectPlatform('shopify', { apiKey: shopifyKey, domain: storeDomain })}
                                            disabled={!shopifyKey.trim() || connecting === 'shopify'}
                                            style={{ padding: '6px 14px', background: !shopifyKey.trim() ? '#d1d5db' : GREEN, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: !shopifyKey.trim() ? 'not-allowed' : 'pointer', opacity: connecting === 'shopify' ? 0.7 : 1 }}>{connecting === 'shopify' ? 'Validating...' : 'Connect'}</button>
                                    </>
                                )}
                            </div>

                            {/* Meta */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: connectedPlatforms.includes('meta') ? 0 : 12 }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>📘 Meta Ads</span>
                                    {connectedPlatforms.includes('meta') && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>✓ Connected</span>}
                                </div>
                                {!connectedPlatforms.includes('meta') && (
                                    <>
                                        <input type="text" value={metaToken} onChange={e => setMetaToken(e.target.value)} placeholder="Access Token"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <input type="text" value={metaAccountId} onChange={e => setMetaAccountId(e.target.value)} placeholder="Ad Account ID (act_...)"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <button onClick={() => connectPlatform('meta', { accessToken: metaToken, adAccountId: metaAccountId })}
                                            disabled={(!metaToken.trim() && !metaAccountId.trim()) || connecting === 'meta'}
                                            style={{ padding: '6px 14px', background: (!metaToken.trim() && !metaAccountId.trim()) ? '#d1d5db' : '#1877f2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: (!metaToken.trim() && !metaAccountId.trim()) ? 'not-allowed' : 'pointer', opacity: connecting === 'meta' ? 0.7 : 1 }}>{connecting === 'meta' ? 'Validating...' : 'Connect'}</button>
                                    </>
                                )}
                            </div>

                            {/* Google */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: connectedPlatforms.includes('google') ? 0 : 12 }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>🔍 Google Ads</span>
                                    {connectedPlatforms.includes('google') && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>✓ Connected</span>}
                                </div>
                                {!connectedPlatforms.includes('google') && (
                                    <>
                                        <input type="text" value={googleToken} onChange={e => setGoogleToken(e.target.value)} placeholder="Developer Token / OAuth Token"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <input type="text" value={googleCustomerId} onChange={e => setGoogleCustomerId(e.target.value)} placeholder="Customer ID (123-456-7890)"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <button onClick={() => connectPlatform('google', { developerToken: googleToken, customerId: googleCustomerId })}
                                            disabled={(!googleToken.trim() && !googleCustomerId.trim()) || connecting === 'google'}
                                            style={{ padding: '6px 14px', background: (!googleToken.trim() && !googleCustomerId.trim()) ? '#d1d5db' : '#ea4335', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: (!googleToken.trim() && !googleCustomerId.trim()) ? 'not-allowed' : 'pointer', opacity: connecting === 'google' ? 0.7 : 1 }}>{connecting === 'google' ? 'Validating...' : 'Connect'}</button>
                                    </>
                                )}
                            </div>

                            {/* TikTok */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: connectedPlatforms.includes('tiktok') ? 0 : 12 }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>🎵 TikTok Ads</span>
                                    {connectedPlatforms.includes('tiktok') && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>✓ Connected</span>}
                                </div>
                                {!connectedPlatforms.includes('tiktok') && (
                                    <>
                                        <input type="text" value={tiktokToken} onChange={e => setTiktokToken(e.target.value)} placeholder="Access Token"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <input type="text" value={tiktokAdvertiserId} onChange={e => setTiktokAdvertiserId(e.target.value)} placeholder="Advertiser ID"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                                        <button onClick={() => connectPlatform('tiktok', { accessToken: tiktokToken, advertiserId: tiktokAdvertiserId })}
                                            disabled={(!tiktokToken.trim() && !tiktokAdvertiserId.trim()) || connecting === 'tiktok'}
                                            style={{ padding: '6px 14px', background: (!tiktokToken.trim() && !tiktokAdvertiserId.trim()) ? '#d1d5db' : '#111', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: (!tiktokToken.trim() && !tiktokAdvertiserId.trim()) ? 'not-allowed' : 'pointer', opacity: connecting === 'tiktok' ? 0.7 : 1 }}>{connecting === 'tiktok' ? 'Validating...' : 'Connect'}</button>
                                    </>
                                )}
                            </div>

                            {/* Security note */}
                            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#166534' }}>
                                🔒 All credentials are encrypted with AES-256 before storage. We never store plain-text tokens.
                            </div>

                            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                                💡 Ad platforms are optional. You can run reconciliation with just Shopify to see your order data first.
                            </p>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!connectedPlatforms.includes('shopify')}
                                style={{
                                    width: '100%', padding: '12px 0', background: connectedPlatforms.includes('shopify') ? GREEN : '#d1d5db',
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                                    cursor: connectedPlatforms.includes('shopify') ? 'pointer' : 'not-allowed',
                                }}>
                                {connectedPlatforms.length >= 2 ? 'Continue →' : 'Continue with Shopify only →'}
                            </button>
                        </div>
                    )}

                    {/* Step 3: Done */}
                    {step === 3 && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Store Connected!</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                                {storeName} is now being monitored. Your first reconciliation report is being generated.
                            </p>
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
