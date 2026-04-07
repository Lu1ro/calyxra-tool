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
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteStore = async (storeId) => {
        setDeleting(true);
        try {
            const res = await fetch('/api/stores', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStores(stores.filter(s => s.id !== storeId));
            setDeleteConfirm(null);
        } catch (err) {
            alert('Failed to delete store: ' + err.message);
        } finally {
            setDeleting(false);
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
                                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
                                    onClick={() => router.push(`/dashboard/stores/${store.id}`)}>
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
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(store); }}
                                        title="Delete store"
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                                            borderRadius: 6, color: 'var(--c-gray-400)', transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-gray-400)'; e.currentTarget.style.background = 'none'; }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                    </button>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}
                                        onClick={() => router.push(`/dashboard/stores/${store.id}`)}>
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ height: 32 }} />
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                        onClick={() => !deleting && setDeleteConfirm(null)} />
                    <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 420, padding: 28, zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--c-gray-900)' }}>Delete Store</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-gray-500)' }}>This action cannot be undone</p>
                            </div>
                        </div>
                        <div style={{
                            padding: '14px 16px', borderRadius: 10,
                            background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 20,
                        }}>
                            <p style={{ margin: 0, fontSize: 14, color: '#991b1b', lineHeight: 1.5 }}>
                                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? All connections, reports, and alerts for this store will be permanently removed.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteStore(deleteConfirm.id)}
                                disabled={deleting}
                                style={{
                                    padding: '8px 20px', borderRadius: 8, fontSize: 14,
                                    fontWeight: 600, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer',
                                    background: '#dc2626', color: '#fff',
                                    opacity: deleting ? 0.6 : 1, transition: 'all 0.15s',
                                    fontFamily: 'Inter, sans-serif',
                                }}
                            >
                                {deleting ? 'Deleting...' : 'Delete Store'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

