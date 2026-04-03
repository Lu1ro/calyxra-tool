// pages/dashboard/stores/index.js
// Stores list page — all connected stores
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Skeleton from '@/components/Skeleton';

export default function StoresPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);

    useEffect(() => {
        if (session) fetchStores();
    }, [session]);

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            setStores(data.stores || []);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || status === 'unauthenticated') {
        return <DashboardLayout title="Stores — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    const tierLimits = { free: 1, paid: 3, agency: 50 };
    const maxStores = tierLimits[session.user?.tier] || 1;

    return (
        <DashboardLayout title="Stores — Calyxra">
            <div className="container" style={{ maxWidth: 900 }}>
                <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-gray-900)', margin: 0, letterSpacing: '-0.02em' }}>Your Stores</h1>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginTop: 4 }}>{stores.length} of {maxStores} stores connected</p>
                    </div>
                    {stores.length < maxStores && (
                        <button className="btn btn-primary" onClick={() => router.push('/dashboard/stores/add')}>+ Add Store</button>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gap: 12 }}><Skeleton height={80} /><Skeleton height={80} /><Skeleton height={80} /></div>
                ) : stores.length === 0 ? (
                    <div className="card animate-fade-in" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-400)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>No stores connected yet</h2>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24 }}>Add your first Shopify store to start reconciling revenue.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => router.push('/dashboard/stores/add')}>+ Add Your First Store</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 10 }} className="animate-stagger">
                        {stores.map(store => (
                            <div key={store.id} className="card card-clickable"
                                onClick={() => router.push(`/dashboard/stores/${store.id}`)}
                                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, color: '#166534',
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-gray-800)' }}>{store.name}</h3>
                                        <p style={{ margin: '2px 0 0', color: 'var(--c-gray-500)', fontSize: 13 }}>{store.domain}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {store.connections?.map(c => (
                                        <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>{c.platform}</span>
                                    ))}
                                    <span className={`status-dot ${store.status === 'active' ? 'status-dot-green' : store.status === 'error' ? 'status-dot-red' : 'status-dot-gray'}`} />
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ height: 32 }} />
            </div>
        </DashboardLayout>
    );
}
