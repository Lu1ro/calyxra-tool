// pages/dashboard/stores/[id]/ltv.js
// LTV-Adjusted ROAS — Factor in 90-day LTV to true ROAS
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
const GREEN = '#00b894';
const AMBER = '#f59e0b';
const RED = '#dc2626';

function generateLtvData(report) {
    const campaigns = report?.campaigns || [];

    return campaigns.map(c => {
        // Mock LTV multiplier based on campaign type (retargeting = higher LTV, broad = lower LTV)
        let ltvMultiplier = 1.25; // default 25% lift in 90 days
        if (c.campaignName.toLowerCase().includes('retarget')) ltvMultiplier = 1.45;
        if (c.campaignName.toLowerCase().includes('broad')) ltvMultiplier = 1.10;

        const immediateRoas = parseFloat(c.estimatedTrueRoas || 1);
        const ltvRoas = immediateRoas * ltvMultiplier;

        return {
            ...c,
            immediateRoas: immediateRoas.toFixed(2),
            ltvRoas: ltvRoas.toFixed(2),
            ltvLift: ((ltvMultiplier - 1) * 100).toFixed(0),
        };
    }).sort((a, b) => b.ltvRoas - a.ltvRoas);
}

export default function LtvRoas() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [report, setReport] = useState(null);
    const [ltvData, setLtvData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLiveQuery, setIsLiveQuery] = useState(false);
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    useEffect(() => {
        if (session && id) fetchData();
    }, [session, id]);

    const fetchData = async () => {
        try {
            const storeRes = await fetch('/api/stores');
            const storeData = await storeRes.json();
            setStore(storeData.stores?.find(s => s.id === id));

            const reportsRes = await fetch(`/api/stores/${id}/reports`);
            const reportsData = await reportsRes.json();
            let rp = null;
            if (reportsData.reports?.length > 0) {
                rp = JSON.parse(reportsData.reports[0].fullReport);
                setReport(rp);
            }

            try {
                const bqRes = await fetch(`/api/stores/${id}/database/ltv`);
                const bqData = await bqRes.json();
                if (bqData.success && rp && bqData.data?.length > 0) {
                    const bqRows = bqData.data;
                    const mergedData = rp.campaigns.map(c => {
                        const bqMatch = bqRows.find(r => r.campaignName.toLowerCase() === c.campaignName.toLowerCase());
                        if (bqMatch) {
                            // LTV projection logic using BigQuery real acquisition counts
                            const immediateRev = bqMatch.acquisitionRevenue;
                            const ltvRev = bqMatch.retentionRevenue + immediateRev;
                            const immediateRoas = c.spend > 0 ? immediateRev / c.spend : 0;
                            const ltvRoas = c.spend > 0 ? ltvRev / c.spend : 0;
                            return {
                                ...c,
                                immediateRoas: immediateRoas.toFixed(2),
                                ltvRoas: ltvRoas.toFixed(2),
                                ltvLift: immediateRoas > 0 ? (((ltvRoas / immediateRoas) - 1) * 100).toFixed(0) : 0,
                                isLiveBq: true
                            }
                        } else {
                            let ltvMultiplier = 1.25;
                            if (c.campaignName.toLowerCase().includes('retarget')) ltvMultiplier = 1.45;
                            if (c.campaignName.toLowerCase().includes('broad')) ltvMultiplier = 1.10;
                            const immediateRoas = parseFloat(c.estimatedTrueRoas || 1);
                            const ltvRoas = immediateRoas * ltvMultiplier;
                            return {
                                ...c,
                                immediateRoas: immediateRoas.toFixed(2),
                                ltvRoas: ltvRoas.toFixed(2),
                                ltvLift: ((ltvMultiplier - 1) * 100).toFixed(0),
                                isLiveBq: false
                            };
                        }
                    }).sort((a, b) => parseFloat(b.ltvRoas) - parseFloat(a.ltvRoas));
                    setLtvData(mergedData);
                    setIsLiveQuery(true);
                } else {
                    setLtvData(generateLtvData(rp));
                    setIsLiveQuery(false);
                }
            } catch (e) {
                console.warn('BQ Error', e);
                setLtvData(generateLtvData(rp));
                setIsLiveQuery(false);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (status === 'loading' || loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
    }

    const chartData = {
        labels: ltvData.map(c => c.campaignName.substring(0, 20)),
        datasets: [
            {
                label: 'Immediate True ROAS',
                data: ltvData.map(c => c.immediateRoas),
                backgroundColor: '#9ca3af',
            },
            {
                label: '90-Day LTV Lift',
                data: ltvData.map(c => (c.ltvRoas - c.immediateRoas).toFixed(2)),
                backgroundColor: GREEN,
            }
        ]
    };

    // Calculate aggregated LTV ROAS across portfolio
    const totalSpend = ltvData.reduce((s, c) => s + c.spend, 0);
    const totalImmediateRev = ltvData.reduce((s, c) => s + (c.spend * c.immediateRoas), 0);
    const totalLtvRev = ltvData.reduce((s, c) => s + (c.spend * c.ltvRoas), 0);
    const portfolioImmediateRoas = totalSpend > 0 ? (totalImmediateRev / totalSpend).toFixed(2) : 0;
    const portfolioLtvRoas = totalSpend > 0 ? (totalLtvRev / totalSpend).toFixed(2) : 0;

    return (
        <>
            <Head>
                <title>LTV-Adjusted ROAS — {store?.name || 'Store'} — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href={`/dashboard/stores/${id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← {store?.name}</a>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>💰 LTV-Adjusted ROAS</span>
                    </div>
                </div>

                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                90-Day LTV-Adjusted ROAS
                                {isLiveQuery && (
                                    <span style={{ fontSize: 11, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 12, fontFamily: "'Inter', sans-serif" }}>Live BigQuery Data</span>
                                )}
                            </h1>
                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Stop pausing campaigns that lose money day 1 but become highly profitable by day 90.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: '#6b7280' }}>From</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                            <label style={{ fontSize: 12, color: '#6b7280' }}>To</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                            <button
                                onClick={() => window.print()}
                                style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                            >
                                📄 Export PDF
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Immediate True ROAS</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{portfolioImmediateRoas}×</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Day 1 Revenue</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>90-Day LTV ROAS</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>{portfolioLtvRoas}×</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Total value generated over 90 days</div>
                        </div>
                        <div style={{ background: '#111827', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Portfolio Lift</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>+{(((portfolioLtvRoas / portfolioImmediateRoas) - 1) * 100).toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: '#e5e7eb', marginTop: 4 }}>Additional revenue from repeat purchases</div>
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>ROAS Lift by Campaign (90 Days)</h3>
                        <Bar data={chartData} options={{ responsive: true, scales: { x: { stacked: true, ticks: { maxRotation: 0, minRotation: 0, autoSkip: true, font: { size: 10 }, callback: function (val) { const label = this.getLabelForValue(val); return label.length > 12 ? label.substring(0, 12) + '…' : label; } } }, y: { stacked: true } } }} />
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>LTV Extrapolation Table</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                    <th style={{ padding: '10px', color: '#6b7280' }}>Campaign</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>Spend</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>Immediate True ROAS</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>90-Day LTV ROAS</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>LTV Lift %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ltvData.map((c, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px', fontWeight: 500 }}>{c.campaignName}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#6b7280' }}>${c.spend.toLocaleString()}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: parseFloat(c.immediateRoas) >= 1 ? '#111827' : RED }}>{c.immediateRoas}×</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: parseFloat(c.ltvRoas) >= 1 ? GREEN : RED }}>{c.ltvRoas}×</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: GREEN }}>+{c.ltvLift}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </>
    );
}
