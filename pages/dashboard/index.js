// pages/dashboard/index.js
// Agency dashboard — overview with KPIs, quick actions, and recent activity
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

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);

    useEffect(() => {
        if (session) { fetchStores(); fetchAlertCount(); }
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
            await buildPortfolioStats(storeList);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        } finally {
            setLoading(false);
        }
    };

    const buildPortfolioStats = async (storeList) => {
        let totalPhantom = 0, totalNetRevenue = 0, totalAdSpend = 0, totalReports = 0;
        let worstStore = null, worstPhantomPct = 0;
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
                        storeName: store.name, storeId: store.id, date: latest.createdAt,
                        phantomPct: latest.phantomPct, trueRoas: latest.trueRoas, isDemo: latest.isDemo,
                    });
                }
            } catch (e) { /* skip */ }
        }

        const avgMER = totalAdSpend > 0 ? (totalNetRevenue / totalAdSpend).toFixed(2) : null;
        setPortfolioStats({
            totalPhantom, totalNetRevenue, avgMER, totalReports, worstStore,
            recentRuns: recentRuns.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
        });
    };

    if (status === 'loading' || status === 'unauthenticated') {
        return <DashboardLayout title="Dashboard — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    const userName = session.user?.name || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const tierLimits = { free: 1, paid: 3, agency: 50 };
    const maxStores = tierLimits[session.user.tier] || 1;
    const fmt = (v) => '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
    const hasData = portfolioStats && portfolioStats.totalReports > 0;

    const phantomIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
    const revenueIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
    const merIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
    const alertIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;

    return (
        <DashboardLayout title="Dashboard — Calyxra">
            {showLogoutConfirm && (
                <ConfirmModal title="Sign out?" message="Are you sure you want to sign out?" confirmLabel="Sign out" danger
                    onConfirm={() => signOut({ callbackUrl: '/login' })} onCancel={() => setShowLogoutConfirm(false)} />
            )}

            <div className="container" style={{ maxWidth: 1000 }}>
                {/* Greeting */}
                <div className="animate-fade-in" style={{ marginBottom: 28, paddingTop: 4 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-gray-900)', margin: 0, letterSpacing: '-0.02em' }}>
                        {greeting}, {userName}
                    </h1>
                    <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginTop: 4 }}>
                        {hasData
                            ? `You have ${stores.length} store${stores.length !== 1 ? 's' : ''} and ${portfolioStats.totalReports} report${portfolioStats.totalReports !== 1 ? 's' : ''}.`
                            : `Here's your command center. Let's get started.`
                        }
                    </p>
                </div>

                {/* Portfolio KPIs — only if there's data */}
                {hasData && (
                    <div style={{ marginBottom: 28 }} className="animate-stagger">
                        <div className="kpi-grid kpi-grid-4" style={{ marginBottom: 20 }}>
                            <KPICard
                                label="Phantom Revenue"
                                value={fmt(portfolioStats.totalPhantom)}
                                subtitle={`Across ${stores.length} store${stores.length !== 1 ? 's' : ''}`}
                                color="#ef4444"
                                tint="#fef2f2"
                                icon={phantomIcon}
                                tooltip="Revenue that ad platforms claim but never arrived in Shopify. The gap between reported and real sales."
                            />
                            <KPICard
                                label="Net Revenue"
                                value={fmt(portfolioStats.totalNetRevenue)}
                                subtitle="Shopify verified"
                                color="#064E3B"
                                tint="#ECFDF5"
                                icon={revenueIcon}
                                tooltip="Total revenue after discounts, refunds, and chargebacks. Verified directly from Shopify."
                            />
                            <KPICard
                                label="Portfolio MER"
                                value={`${portfolioStats.avgMER || '\u2014'}\u00d7`}
                                subtitle="Marketing Efficiency Ratio"
                                color="#6366f1"
                                icon={merIcon}
                                tooltip="Marketing Efficiency Ratio — total net revenue divided by total ad spend across all stores. Higher means your marketing is more efficient."
                            />
                            <KPICard
                                label="Needs Attention"
                                value={portfolioStats.worstStore ? portfolioStats.worstStore.name : 'All healthy'}
                                subtitle={portfolioStats.worstStore ? `${portfolioStats.worstStore.phantomPct}% phantom` : 'No issues detected'}
                                color={portfolioStats.worstStore ? '#f59e0b' : '#064E3B'}
                                tint={portfolioStats.worstStore ? '#fffbeb' : undefined}
                                icon={alertIcon}
                                tooltip="The store with the highest phantom revenue percentage. This is where ad platforms overstate results the most."
                            />
                        </div>

                        {/* Recent Reconciliations */}
                        {portfolioStats.recentRuns.length > 0 && (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-gray-100)' }}>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>Recent Reconciliations</h4>
                                </div>
                                {portfolioStats.recentRuns.map((run, i) => (
                                    <div key={i}
                                        onClick={() => router.push(`/dashboard/stores/${run.storeId}`)}
                                        style={{
                                            padding: '12px 20px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: 'pointer',
                                            borderBottom: i < portfolioStats.recentRuns.length - 1 ? '1px solid var(--c-gray-50)' : 'none',
                                            transition: 'background 150ms',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--c-gray-50)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>{run.storeName}</span>
                                            <span className={`badge ${run.isDemo ? 'badge-gray' : 'badge-green'}`} style={{ fontSize: 10 }}>{run.isDemo ? 'Demo' : 'Live'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
                                            <span style={{ color: '#ef4444', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{run.phantomPct}%</span>
                                            <span style={{ color: '#064E3B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{run.trueRoas}{'\u00d7'}</span>
                                            <span style={{ color: 'var(--c-gray-400)', fontSize: 12 }}>{new Date(run.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Actions — always visible */}
                {!hasData && !loading && (
                    <div className="animate-fade-in" style={{ marginBottom: 28 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-gray-800)', margin: '0 0 12px' }}>Quick Actions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div className="card card-clickable" onClick={() => router.push('/dashboard/stores/add')} style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                                    background: 'linear-gradient(135deg, #ECFDF5, #dcfce7)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534',
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </div>
                                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>Add Store</h4>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--c-gray-400)' }}>Connect a Shopify store</p>
                            </div>

                            {stores.length > 0 && (
                                <div className="card card-clickable" onClick={() => router.push(`/dashboard/stores/${stores[0].id}/settings`)} style={{ padding: '20px', textAlign: 'center' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                                        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af',
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                    </div>
                                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>Connect Ads</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--c-gray-400)' }}>Link Meta or Google Ads</p>
                                </div>
                            )}

                            {stores.length > 0 && (
                                <div className="card card-clickable" onClick={() => router.push(`/dashboard/stores/${stores[0].id}`)} style={{ padding: '20px', textAlign: 'center' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                                        background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9d174d',
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    </div>
                                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>Run Reconciliation</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--c-gray-400)' }}>Detect phantom revenue</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Stores overview — compact version, not the full list */}
                {stores.length > 0 && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-gray-800)', margin: 0 }}>Your Stores</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard/stores')} style={{ fontSize: 13 }}>
                                View all →
                            </button>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {stores.slice(0, 5).map(store => (
                                <div key={store.id} className="card card-clickable"
                                    onClick={() => router.push(`/dashboard/stores/${store.id}`)}
                                    style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 9,
                                            background: 'linear-gradient(135deg, #ECFDF5, #dcfce7)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, color: '#166534',
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>{store.name}</h3>
                                            <p style={{ margin: '1px 0 0', color: 'var(--c-gray-400)', fontSize: 12 }}>{store.domain}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {store.connections?.map(c => (
                                            <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>{c.platform}</span>
                                        ))}
                                        <span className={`status-dot ${store.status === 'active' ? 'status-dot-green' : store.status === 'error' ? 'status-dot-red' : 'status-dot-gray'}`} />
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state when no stores */}
                {!loading && stores.length === 0 && (
                    <div className="card animate-fade-in" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-400)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>No stores connected yet</h2>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24 }}>Add your first Shopify store to start reconciling revenue.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => router.push('/dashboard/stores/add')}>+ Add Your First Store</button>
                    </div>
                )}

                <div style={{ height: 32 }} />
            </div>
        </DashboardLayout>
    );
}
