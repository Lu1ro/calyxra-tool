// pages/dashboard/alerts.js
// Alert inbox — shows all alerts across stores with resolve/dismiss actions

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const GREEN = '#00b894';
const RED = '#dc2626';
const AMBER = '#f59e0b';
const BLUE = '#2563eb';

const SEVERITY_CONFIG = {
    critical: { emoji: '🚨', color: RED, bg: '#fef2f2', label: 'CRITICAL' },
    high: { emoji: '⚠️', color: '#92400e', bg: '#fffbeb', label: 'HIGH' },
    medium: { emoji: 'ℹ️', color: '#1e40af', bg: '#eff6ff', label: 'MEDIUM' },
};

const TYPE_LABELS = {
    phantom_spike: 'Phantom Spike',
    roas_drop: 'ROAS Drop',
    unprofitable_campaign: 'Unprofitable Campaign',
    high_phantom: 'High Phantom Revenue',
    stale_data: 'Stale Data',
    api_failure: 'API Failure',
};

export default function AlertInbox() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [alerts, setAlerts] = useState([]);
    const [unresolvedCount, setUnresolvedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unresolved'); // unresolved | all | critical
    const [agencyTier, setAgencyTier] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

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
            if (filter === 'critical') {
                filtered = filtered.filter(a => a.severity === 'critical');
            }
            setAlerts(filtered);
            setUnresolvedCount(data.unresolvedCount || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resolveAlert = async (alertId) => {
        try {
            await fetch('/api/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId, resolved: true }),
            });
            fetchAlerts();
        } catch (err) {
            console.error(err);
        }
    };

    const resolveAll = async () => {
        for (const alert of alerts.filter(a => !a.resolved)) {
            await fetch('/api/alerts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId: alert.id, resolved: true }),
            });
        }
        fetchAlerts();
    };

    if (status === 'loading' || loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
    }

    if (agencyTier === 'free') {
        return (
            <>
                <Head>
                    <title>Alerts — Calyxra Dashboard</title>
                    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                </Head>
                <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 420 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>Alerts require a paid plan</h2>
                        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Upgrade to get real-time monitoring alerts when phantom revenue spikes or ROAS drops.</p>
                        <a href="https://calyxra.com/#pricing" style={{
                            display: 'inline-block', background: '#00b894', color: 'white', padding: '10px 24px',
                            borderRadius: '8px', textDecoration: 'none', fontWeight: 600,
                        }}>Upgrade — $150/month</a>
                        <div style={{ marginTop: 16 }}>
                            <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 13 }}>← Back to Dashboard</a>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Alerts — Calyxra Dashboard</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← Dashboard</a>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>🔔 Alert Inbox</span>
                        {unresolvedCount > 0 && (
                            <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                background: RED, color: '#fff', fontWeight: 700,
                            }}>{unresolvedCount}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {alerts.filter(a => !a.resolved).length > 0 && (
                            <button onClick={resolveAll} style={{
                                padding: '6px 14px', background: '#e5e7eb', border: 'none',
                                borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151',
                            }}>✓ Resolve All</button>
                        )}
                    </div>
                </div>

                <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {[
                            { key: 'unresolved', label: `Unresolved (${unresolvedCount})` },
                            { key: 'critical', label: '🚨 Critical Only' },
                            { key: 'all', label: 'All Alerts' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '6px 14px', borderRadius: 6, fontSize: 13,
                                    border: filter === f.key ? '2px solid #00b894' : '1px solid #d1d5db',
                                    background: filter === f.key ? '#e6f7f4' : '#fff',
                                    color: filter === f.key ? GREEN : '#374151',
                                    fontWeight: filter === f.key ? 600 : 400,
                                    cursor: 'pointer',
                                }}
                            >{f.label}</button>
                        ))}
                    </div>

                    {/* Alert List */}
                    {alerts.length === 0 ? (
                        <div style={{
                            background: '#fff', borderRadius: 12, padding: 60,
                            textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>All clear!</h2>
                            <p style={{ color: '#6b7280', fontSize: 14 }}>No {filter === 'critical' ? 'critical ' : filter === 'unresolved' ? 'unresolved ' : ''}alerts right now.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {alerts.map(alert => {
                                const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
                                return (
                                    <div key={alert.id} style={{
                                        background: '#fff', borderRadius: 10, padding: 16,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                        borderLeft: `4px solid ${config.color}`,
                                        opacity: alert.resolved ? 0.6 : 1,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                                        background: config.bg, color: config.color, fontWeight: 700,
                                                    }}>{config.emoji} {config.label}</span>
                                                    <span style={{
                                                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                                        background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
                                                    }}>{TYPE_LABELS[alert.type] || alert.type}</span>
                                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                                        {alert.store?.name}
                                                    </span>
                                                </div>
                                                <h4 style={{ margin: '4px 0', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                                    {alert.title}
                                                </h4>
                                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                                                    {alert.message}
                                                </p>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                    {alert.resolved && ` • Resolved ${new Date(alert.resolvedAt).toLocaleString()}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexShrink: 0 }}>
                                                <a href={`/dashboard/stores/${alert.storeId}`} style={{
                                                    padding: '4px 10px', background: '#f3f4f6', borderRadius: 6,
                                                    color: '#374151', textDecoration: 'none', fontSize: 12,
                                                }}>View Store</a>
                                                {!alert.resolved && (
                                                    <button onClick={() => resolveAlert(alert.id)} style={{
                                                        padding: '4px 10px', background: '#e6f7f4', border: 'none',
                                                        borderRadius: 6, color: GREEN, fontSize: 12,
                                                        fontWeight: 600, cursor: 'pointer',
                                                    }}>Resolve</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
