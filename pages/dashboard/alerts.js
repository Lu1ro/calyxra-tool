// pages/dashboard/alerts.js
// Alert inbox — shows all alerts across stores with resolve/dismiss actions

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const SEVERITY_CONFIG = {
    critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'CRITICAL' },
    high: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'HIGH' },
    medium: { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'MEDIUM' },
    low: { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', label: 'LOW' },
};

const TYPE_LABELS = {
    phantom_spike: 'Phantom Spike', roas_drop: 'ROAS Drop',
    unprofitable_campaign: 'Unprofitable Campaign', high_phantom: 'High Phantom Revenue',
    stale_data: 'Stale Data', api_failure: 'API Failure',
};

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AlertInbox() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [alerts, setAlerts] = useState([]);
    const [unresolvedCount, setUnresolvedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unresolved');
    const [agencyTier, setAgencyTier] = useState(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status]);

    useEffect(() => {
        if (session) {
            fetchAlerts();
            fetch('/api/agency').then(r => r.json()).then(d => setAgencyTier(d.tier || 'free')).catch(() => setAgencyTier('free'));
        }
    }, [session, filter]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            let url = '/api/alerts?limit=100';
            if (filter === 'unresolved') url += '&resolved=false';
            const res = await fetch(url);
            const data = await res.json();
            let filtered = data.alerts || [];
            if (filter === 'critical') filtered = filtered.filter(a => a.severity === 'critical');
            setAlerts(filtered);
            setUnresolvedCount(data.unresolvedCount || 0);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const resolveAlert = async (alertId) => {
        try {
            await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId, resolved: true }) });
            fetchAlerts();
        } catch (err) { console.error(err); }
    };

    const resolveAll = async () => {
        for (const alert of alerts.filter(a => !a.resolved)) {
            await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId: alert.id, resolved: true }) });
        }
        fetchAlerts();
    };

    if (agencyTier === 'free') {
        return (
            <DashboardLayout title="Alerts — Calyxra">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-400)" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>Alerts require a paid plan</h2>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>Upgrade to get real-time monitoring alerts when phantom revenue spikes or ROAS drops.</p>
                        <a href="https://calyxra.com/#pricing" className="btn btn-primary" style={{ textDecoration: 'none' }}>Upgrade &mdash; $150/month</a>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Alerts — Calyxra">
            <div className="container" style={{ maxWidth: 800 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--c-gray-900)', letterSpacing: '-0.02em' }}>Alert Inbox</h1>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14, marginTop: 4 }}>{unresolvedCount} unresolved alert{unresolvedCount !== 1 ? 's' : ''}</p>
                    </div>
                    {alerts.filter(a => !a.resolved).length > 0 && (
                        <button onClick={resolveAll} className="btn btn-secondary btn-sm">Resolve All</button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[
                        { key: 'unresolved', label: `Unresolved (${unresolvedCount})` },
                        { key: 'critical', label: 'Critical Only' },
                        { key: 'all', label: 'All Alerts' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 13, border: 'none',
                                background: filter === f.key ? '#ECFDF5' : 'var(--c-white)',
                                color: filter === f.key ? '#166534' : 'var(--c-gray-600)',
                                fontWeight: filter === f.key ? 600 : 500, cursor: 'pointer',
                                boxShadow: filter === f.key ? 'inset 0 0 0 1.5px #a7f3d0' : 'inset 0 0 0 1px var(--c-gray-200)',
                                transition: 'all 150ms',
                            }}
                        >{f.label}</button>
                    ))}
                </div>

                {/* Alert List */}
                {loading ? (
                    <div style={{ display: 'grid', gap: 10 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}</div>
                ) : alerts.length === 0 ? (
                    <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#064E3B" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--c-gray-800)' }}>All clear!</h2>
                        <p style={{ color: 'var(--c-gray-500)', fontSize: 14 }}>No {filter === 'critical' ? 'critical ' : filter === 'unresolved' ? 'unresolved ' : ''}alerts right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="animate-stagger">
                        {alerts.map(alert => {
                            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
                            return (
                                <div key={alert.id} className="card" style={{
                                    padding: 0, overflow: 'hidden', opacity: alert.resolved ? 0.6 : 1,
                                    borderLeft: `3px solid ${config.color}`,
                                }}>
                                    <div style={{ padding: '14px 18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                                                        background: config.bg, color: config.color, letterSpacing: '0.05em',
                                                    }}>{config.label}</span>
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                                                        background: 'var(--c-gray-100)', color: 'var(--c-gray-600)',
                                                    }}>{TYPE_LABELS[alert.type] || alert.type}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--c-gray-400)' }}>{alert.store?.name}</span>
                                                </div>
                                                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-800)' }}>{alert.title}</h4>
                                                <p style={{ margin: 0, fontSize: 13, color: 'var(--c-gray-500)', lineHeight: 1.5 }}>{alert.message}</p>
                                                <div style={{ fontSize: 12, color: 'var(--c-gray-400)', marginTop: 8 }}>
                                                    {timeAgo(alert.createdAt)}
                                                    {alert.resolved && ` \u00b7 Resolved ${timeAgo(alert.resolvedAt)}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }}>
                                                <a href={`/dashboard/stores/${alert.storeId}`} className="btn btn-ghost btn-xs" style={{ textDecoration: 'none' }}>View</a>
                                                {!alert.resolved && (
                                                    <button onClick={() => resolveAlert(alert.id)} className="btn btn-xs"
                                                        style={{ background: 'transparent', border: '1px solid #a7f3d0', color: '#043927', transition: 'all 150ms' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#ECFDF5'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                    >Resolve</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
