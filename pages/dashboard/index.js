// pages/dashboard/index.js
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmModal from '@/components/ConfirmModal';
import KPICard from '@/components/KPICard';
import Skeleton from '@/components/Skeleton';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stores, setStores] = useState([]);
    const [alertCount, setAlertCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [portfolioStats, setPortfolioStats] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchStores();
            fetchAlertCount();
        }
    }, [session]);

    const fetchAlertCount = async () => {
        try {
            const res = await fetch('/api/alerts?resolved=false&limit=1');
            const data = await res.json();
            setAlertCount(data.unresolvedCount || 0);
        } catch (err) { /* skip */ }
    };

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const storeList = data.stores || [];
            setStores(storeList);

            // Build portfolio summary from store reports
            await buildPortfolioStats(storeList);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        } finally {
            setLoading(false);
        }
    };

    const buildPortfolioStats = async (storeList) => {
        let totalPhantom = 0;
        let totalNetRevenue = 0;
        let totalAdSpend = 0;
        let totalReports = 0;
        let worstStore = null;
        let worstPhantomPct = 0;
        const recentRuns = [];

        for (const store of storeList) {
            try {
                const res = await fetch(`/api/stores/${store.id}/reports`);
                const data = await res.json();
                const reps = data.reports || [];
                if (reps.length > 0) {
                    const latest = reps[0];
                    totalReports += reps.length;
                    totalPhantom += latest.phantomRevenue || 0;
                    totalNetRevenue += latest.netRevenue || 0;
                    totalAdSpend += latest.totalAdSpend || 0;

                    if (latest.phantomPct > worstPhantomPct) {
                        worstPhantomPct = latest.phantomPct;
                        worstStore = { name: store.name, phantomPct: latest.phantomPct, trueRoas: latest.trueRoas, id: store.id };
                    }

                    recentRuns.push({
                        storeName: store.name,
                        storeId: store.id,
                        date: latest.createdAt,
                        phantomPct: latest.phantomPct,
                        trueRoas: latest.trueRoas,
                        isDemo: latest.isDemo,
                    });
                }
            } catch (e) { /* skip */ }
        }

        const avgMER = totalAdSpend > 0 ? (totalNetRevenue / totalAdSpend).toFixed(2) : null;

        setPortfolioStats({
            totalPhantom,
            totalNetRevenue,
            avgMER,
            totalReports,
            worstStore,
            recentRuns: recentRuns.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
        });
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    if (status === 'loading' || status === 'unauthenticated') {
        return <div className="page-bg flex-center" style={{ minHeight: '100vh' }}>Loading...</div>;
    }

    const tierLimits = { free: 1, pilot: 2, scale: 5, pro: 10 };
    const maxStores = tierLimits[session.user.tier] || 1;
    const fmt = (v) => '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

    return (
        <DashboardLayout title="Dashboard — Calyxra">
            {showLogoutConfirm && (
                <ConfirmModal
                    title="Sign out?"
                    message="Are you sure you want to sign out of your Calyxra dashboard?"
                    confirmLabel="Sign out"
                    danger
                    onConfirm={() => signOut({ callbackUrl: '/login' })}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}

            <div>
                <div className="container" style={{ maxWidth: 960 }}>

                    {/* Portfolio Summary */}
                    {portfolioStats && portfolioStats.totalReports > 0 && (
                        <div style={{ marginBottom: 28 }}>
                            <div className="kpi-grid kpi-grid-4 animate-stagger" style={{ marginBottom: 16 }}>
                                <KPICard label="Total Phantom Revenue" value={fmt(portfolioStats.totalPhantom)} subtitle={`Across ${stores.length} store${stores.length !== 1 ? 's' : ''}`} color="var(--c-red)" accentBorder />
                                <KPICard label="Net Revenue (Total)" value={fmt(portfolioStats.totalNetRevenue)} subtitle="Shopify verified" color="var(--c-green)" accentBorder />
                                <KPICard label="Portfolio MER" value={`${portfolioStats.avgMER || '—'}×`} subtitle="Marketing Efficiency Ratio" color="#3730a3" accentBorder />
                                <KPICard label="Needs Attention"
                                    value={portfolioStats.worstStore ? portfolioStats.worstStore.name : '✅ All healthy'}
                                    subtitle={portfolioStats.worstStore ? `${portfolioStats.worstStore.phantomPct}% phantom · ${portfolioStats.worstStore.trueRoas}× ROAS` : ''}
                                    color={portfolioStats.worstStore ? 'var(--c-amber)' : 'var(--c-green)'} accentBorder />
                            </div>

                            {/* Recent Activity */}
                            {portfolioStats.recentRuns.length > 0 && (
                                <div className="card" style={{ marginBottom: 16 }}>
                                    <h4 className="text-base font-semibold" style={{ margin: '0 0 10px', color: 'var(--c-gray-700)' }}>📋 Recent Reconciliations</h4>
                                    {portfolioStats.recentRuns.map((run, i) => (
                                        <div key={i}
                                            onClick={() => router.push(`/dashboard/stores/${run.storeId}`)}
                                            className="flex-between"
                                            style={{ padding: '8px 0', borderBottom: i < portfolioStats.recentRuns.length - 1 ? '1px solid var(--c-gray-100)' : 'none', cursor: 'pointer' }}>
                                            <div className="flex-gap-2">
                                                <span className="text-md font-semibold">{run.storeName}</span>
                                                <span className={`badge ${run.isDemo ? 'badge-gray' : 'badge-green'}`}>{run.isDemo ? 'Demo' : 'Live'}</span>
                                            </div>
                                            <div className="flex-gap-4 text-base">
                                                <span style={{ color: 'var(--c-red)', fontWeight: 600 }}>{run.phantomPct}%</span>
                                                <span style={{ color: 'var(--c-green)', fontWeight: 600 }}>{run.trueRoas}×</span>
                                                <span className="text-sm text-muted">{new Date(run.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-between animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <div>
                            <h1 className="heading-serif" style={{ fontSize: 'var(--text-3xl)', margin: 0 }}>Your Stores</h1>
                            <p className="text-muted text-md" style={{ marginTop: 4 }}>{stores.length} of {maxStores} stores connected</p>
                        </div>
                        {stores.length < maxStores && (
                            <button className="btn btn-primary" onClick={() => router.push('/dashboard/stores/add')}>+ Add Store</button>
                        )}
                    </div>

                    {loading ? (
                        <div className="kpi-grid" style={{ gridTemplateColumns: '1fr' }}><Skeleton height={120} /><Skeleton height={120} /></div>
                    ) : stores.length === 0 ? (
                        <div className="card animate-fade-in" style={{ padding: 60, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
                            <h2 className="heading-serif" style={{ fontSize: 'var(--text-xl)', margin: '0 0 8px' }}>No stores connected yet</h2>
                            <p className="text-muted text-md" style={{ marginBottom: 24 }}>Add your first Shopify store to start reconciling revenue.</p>
                            <button className="btn btn-primary" onClick={() => router.push('/dashboard/stores/add')}>+ Add Your First Store</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }} className="animate-stagger">
                            {stores.map(store => (
                                <div key={store.id} className="card card-clickable flex-between"
                                    onClick={() => router.push(`/dashboard/stores/${store.id}`)}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: 'var(--text-lg)' }}>{store.name}</h3>
                                        <p className="text-muted text-base" style={{ margin: 0 }}>{store.domain}</p>
                                    </div>
                                    <div className="flex-gap-3">
                                        <div className="flex-gap-2">
                                            {store.connections?.map(c => (
                                                <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`}>{c.platform}</span>
                                            ))}
                                            <span className={`badge ${store.databaseConfig ? 'badge-green' : 'badge-gray'}`}>🗄️ BQ</span>
                                        </div>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: store.status === 'active' ? '#22c55e' : store.status === 'error' ? 'var(--c-red)' : 'var(--c-gray-400)' }} />
                                        <span className="text-muted" style={{ fontSize: 18 }}>→</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Spacer */}
                    <div style={{ height: 'var(--space-8)' }} />
                </div>
            </div>
        </DashboardLayout>
    );
}
