// pages/dashboard/stores/[id]/profit.js
// Profit Reconciliation — TRUE profit per campaign using COGS/margin data
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import DashboardLayout from '@/components/DashboardLayout';
import StoreNavbar from '@/components/StoreNavbar';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const GREEN = '#064E3B';
const RED = '#dc2626';
const AMBER = '#f59e0b';

// Generate demo profit data based on existing reconciliation data
function generateProfitData(report, itemized = false, marginOverrideStr = '51.91') {
    const campaigns = report?.campaigns || [];
    let parsedOffset = parseFloat(marginOverrideStr);
    if (isNaN(parsedOffset)) parsedOffset = 0;
    const globalMargin = parsedOffset / 100;

    return campaigns.map(c => {
        let marginPct = globalMargin;
        if (itemized) {
            // Mock SKU-level margin logic based on campaign name content
            if (c.campaignName.toLowerCase().includes('accessory')) marginPct = 0.70;
            else if (c.campaignName.toLowerCase().includes('apparel')) marginPct = 0.45;
            else if (c.campaignName.toLowerCase().includes('sale')) marginPct = 0.25;
            else marginPct = 0.55; // default itemized
        }

        const trueRevenue = c.spend * (c.estimatedTrueRoas || 1);
        const cogs = trueRevenue * (1 - marginPct);
        const grossProfit = trueRevenue - cogs;
        const netProfit = grossProfit - c.spend;
        const profitRoas = c.spend > 0 ? (grossProfit / c.spend) : 0;
        const isProfitable = netProfit > 0;

        return {
            ...c,
            trueRevenue,
            cogs,
            grossProfit,
            netProfit,
            profitRoas: profitRoas.toFixed(2),
            marginPct: (marginPct * 100).toFixed(1),
            isProfitable,
        };
    });
}

export default function ProfitReconciliation() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [report, setReport] = useState(null);
    const [profitData, setProfitData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marginOverride, setMarginOverride] = useState('51.91');
    const [sortBy, setSortBy] = useState('netProfit');
    const [useItemizedCogs, setUseItemizedCogs] = useState(false);
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

            setProfitData(generateProfitData(rp, useItemizedCogs, marginOverride));
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const recalculate = (itemized = useItemizedCogs) => {
        setProfitData(generateProfitData(report, itemized, marginOverride));
    };

    const toggleItemized = () => {
        const nextVal = !useItemizedCogs;
        setUseItemizedCogs(nextVal);
        recalculate(nextVal);
    };

    if (status === 'loading' || loading) {
        return <DashboardLayout title="Profit Reconciliation — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    const fmt = v => '$' + Math.round(v || 0).toLocaleString();
    const sorted = [...profitData].sort((a, b) => sortBy === 'netProfit' ? b.netProfit - a.netProfit : b.profitRoas - a.profitRoas);

    // Aggregate stats
    const totalTrueRevenue = profitData.reduce((s, c) => s + c.trueRevenue, 0);
    const totalCOGS = profitData.reduce((s, c) => s + c.cogs, 0);
    const totalGrossProfit = profitData.reduce((s, c) => s + c.grossProfit, 0);
    const totalAdSpend = profitData.reduce((s, c) => s + c.spend, 0);
    const totalNetProfit = totalGrossProfit - totalAdSpend;
    const profitableCount = profitData.filter(c => c.isProfitable).length;
    const unprofitableCount = profitData.filter(c => !c.isProfitable).length;

    // Chart: Profit vs Loss by campaign
    const chartData = {
        labels: sorted.map(c => c.campaignName?.substring(0, 20) || 'Unknown'),
        datasets: [{
            label: 'Net Profit',
            data: sorted.map(c => Math.round(c.netProfit)),
            backgroundColor: sorted.map(c => c.isProfitable ? 'rgba(22, 101, 52, 0.8)' : 'rgba(220, 38, 38, 0.8)'),
            borderRadius: 4,
        }],
    };

    return (
        <DashboardLayout title={`Profit Reconciliation — ${store?.name || 'Store'} — Calyxra`}>
            <StoreNavbar store={store} storeId={id} currentPage={`/dashboard/stores/${id}/profit`} />
            <div className="container" style={{ padding: '24px' }}>
                    {!report ? (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: '0 0 8px' }}>No report data yet</h2>
                            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Run a reconciliation first, then come back for profit analysis.</p>
                            <a href={`/dashboard/stores/${id}`} style={{ padding: '10px 20px', background: GREEN, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Go to Dashboard →</a>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                                        Profit Reconciliation
                                    </h1>
                                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
                                        True profit per campaign after COGS — not just phantom revenue, but phantom <em>profit</em>.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <label style={{ fontSize: 12, color: '#6b7280' }}>From</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                                    <label style={{ fontSize: 12, color: '#6b7280' }}>To</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                                        <input type="checkbox" checked={useItemizedCogs} onChange={toggleItemized} />
                                        Use SKU-Level COGS
                                    </label>
                                    {!useItemizedCogs && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Gross Margin %:</label>
                                            <input
                                                type="number"
                                                value={marginOverride}
                                                onChange={e => setMarginOverride(e.target.value)}
                                                style={{ width: 70, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                                            />
                                            <button onClick={() => recalculate()} style={{ padding: '6px 14px', background: GREEN, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Recalculate</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #3730a3' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>True Revenue</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: '#3730a3' }}>{fmt(totalTrueRevenue)}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>After reconciliation</div>
                                </div>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #6b7280' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>COGS</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>{fmt(totalCOGS)}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>At {marginOverride}% margin</div>
                                </div>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${GREEN}` }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Gross Profit</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>{fmt(totalGrossProfit)}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>Revenue minus COGS</div>
                                </div>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${totalNetProfit >= 0 ? GREEN : RED}` }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Net Profit</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: totalNetProfit >= 0 ? GREEN : RED }}>{fmt(totalNetProfit)}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>After ad spend</div>
                                </div>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${AMBER}` }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Campaign Health</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                        <span style={{ fontSize: 22, fontWeight: 700, color: GREEN }}>{profitableCount}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>profitable</span>
                                        <span style={{ fontSize: 22, fontWeight: 700, color: RED }}>{unprofitableCount}</span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>losing</span>
                                    </div>
                                </div>
                            </div>

                            {/* Profit Chart */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>💰 Net Profit by Campaign</h3>
                                    <Bar data={chartData} options={{
                                        responsive: true,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 45 } },
                                            y: {
                                                ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString() },
                                                grid: { color: 'rgba(0,0,0,0.05)' },
                                            },
                                        },
                                    }} />
                                </div>
                                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📊 Revenue Waterfall</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {[
                                            { label: 'Reported Revenue', value: report.adPlatform?.totalReportedRevenue || 0, color: '#6b7280' },
                                            { label: 'True Revenue', value: totalTrueRevenue, color: '#3730a3' },
                                            { label: '− COGS', value: -totalCOGS, color: '#dc2626' },
                                            { label: 'Gross Profit', value: totalGrossProfit, color: GREEN },
                                            { label: '− Ad Spend', value: -totalAdSpend, color: AMBER },
                                            { label: 'Net Profit', value: totalNetProfit, color: totalNetProfit >= 0 ? GREEN : RED },
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                                <span style={{ fontSize: 13, color: '#374151' }}>{item.label}</span>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{fmt(item.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Detail Table */}
                            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>🎯 Campaign Profitability</h3>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => setSortBy('netProfit')} style={{
                                            padding: '4px 10px', border: 'none', borderRadius: 4, fontSize: 11,
                                            background: sortBy === 'netProfit' ? GREEN : '#e5e7eb',
                                            color: sortBy === 'netProfit' ? '#fff' : '#374151',
                                            cursor: 'pointer', fontWeight: 600,
                                        }}>By Profit</button>
                                        <button onClick={() => setSortBy('profitRoas')} style={{
                                            padding: '4px 10px', border: 'none', borderRadius: 4, fontSize: 11,
                                            background: sortBy === 'profitRoas' ? GREEN : '#e5e7eb',
                                            color: sortBy === 'profitRoas' ? '#fff' : '#374151',
                                            cursor: 'pointer', fontWeight: 600,
                                        }}>By Profit ROAS</button>
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280' }}>Campaign</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280' }}>Channel</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Spend</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>True Rev</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>COGS</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Gross Profit</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Net Profit</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Profit ROAS</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, color: '#6b7280', textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((c, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: c.isProfitable ? 'transparent' : '#fef2f2' }}>
                                                <td style={{ padding: '10px 10px', fontWeight: 500 }}>{c.campaignName}</td>
                                                <td style={{ padding: '10px 10px', color: '#6b7280' }}>{c.channel}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right' }}>{fmt(c.spend)}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right' }}>{fmt(c.trueRevenue)}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right', color: '#6b7280' }}>{fmt(c.cogs)}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right', color: GREEN, fontWeight: 600 }}>{fmt(c.grossProfit)}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: c.isProfitable ? GREEN : RED }}>{fmt(c.netProfit)}</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: parseFloat(c.profitRoas) >= 1 ? GREEN : RED }}>{c.profitRoas}×</td>
                                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                        background: c.isProfitable ? '#e6f7f4' : '#fee2e2',
                                                        color: c.isProfitable ? GREEN : RED,
                                                    }}>
                                                        {c.isProfitable ? '✅ Profitable' : '❌ Losing'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Insight Banner */}
                            <div style={{ marginTop: 24, background: '#111827', borderRadius: 12, padding: 24, color: '#fff' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>💡 Key Insight</h3>
                                <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
                                    {unprofitableCount > 0
                                        ? `${unprofitableCount} of ${profitData.length} campaigns are not generating real profit after COGS. Traditional ROAS metrics show these campaigns as "profitable" — but once you subtract the cost of goods sold, they're actually losing money. Consider pausing or reducing budget on these campaigns and reallocating to your ${profitableCount} truly profitable ones.`
                                        : `All ${profitData.length} campaigns are generating real profit after COGS. Your ad spend is being efficiently converted into margin, not just top-line revenue.`
                                    }
                                </p>
                                {unprofitableCount > 0 && (
                                    <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(220, 38, 38, 0.15)', borderRadius: 8, fontSize: 13/*, color: '#fca5a5'*/ }}>
                                        <strong style={{ color: '#fca5a5' }}>Wasted ad spend on unprofitable campaigns: {fmt(sorted.filter(c => !c.isProfitable).reduce((s, c) => s + c.spend, 0))}</strong>
                                        <span style={{ color: '#9ca3af' }}> — this is money that could be reallocated to your winners.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
        </DashboardLayout>
    );
}
