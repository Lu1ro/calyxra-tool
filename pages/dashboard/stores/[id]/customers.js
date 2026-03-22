// pages/dashboard/stores/[id]/customers.js
// Customer Quality — Analyze repeat vs one-time buyers by campaign
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const GREEN = '#00b894';

// Generate mock customer data based on the campaign report
function generateCustomerData(report) {
    const campaigns = report?.campaigns || [];

    // Default repeat rate from PowerBI screenshot: 1.5% for email, lower for prospecting
    return campaigns.map(c => {
        // Mock new vs returning based on channel logic
        let returningPct = 0.05; // 5% default
        if (c.channel === 'Email' || c.campaignName.toLowerCase().includes('retarget')) returningPct = 0.35;
        if (c.campaignName.toLowerCase().includes('broad') || c.campaignName.toLowerCase().includes('prospect')) returningPct = 0.01;

        const totalCustomers = Math.round((c.spend * (c.estimatedTrueRoas || 1)) / 112.3); // mock AOV of 112.3
        const returningCustomers = Math.round(totalCustomers * returningPct);
        const newCustomers = totalCustomers - returningCustomers;

        return {
            ...c,
            totalCustomers,
            returningCustomers,
            newCustomers,
            returningPct: (returningPct * 100).toFixed(1),
        };
    }).filter(c => c.totalCustomers > 0);
}

export default function CustomerQuality() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [report, setReport] = useState(null);
    const [customerData, setCustomerData] = useState([]);
    const [loading, setLoading] = useState(true);

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
            if (reportsData.reports?.length > 0) {
                const rp = JSON.parse(reportsData.reports[0].fullReport);
                setReport(rp);
                setCustomerData(generateCustomerData(rp));
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (status === 'loading' || loading) {
        return <DashboardLayout title="Customer Quality — Calyxra"><div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div></DashboardLayout>;
    }

    const totalCustomers = customerData.reduce((s, c) => s + c.totalCustomers, 0);
    const totalNew = customerData.reduce((s, c) => s + c.newCustomers, 0);
    const totalReturning = customerData.reduce((s, c) => s + c.returningCustomers, 0);
    const repeatRate = totalCustomers > 0 ? ((totalReturning / totalCustomers) * 100).toFixed(1) : 0;

    const sortedData = [...customerData].sort((a, b) => b.totalCustomers - a.totalCustomers);

    const chartData = {
        labels: sortedData.map(c => c.campaignName.substring(0, 20)),
        datasets: [
            {
                label: 'New Customers',
                data: sortedData.map(c => c.newCustomers),
                backgroundColor: '#3730a3',
            },
            {
                label: 'Returning Customers',
                data: sortedData.map(c => c.returningCustomers),
                backgroundColor: '#10b981',
            }
        ]
    };

    return (
        <DashboardLayout title={`Customer Quality — ${store?.name || 'Store'} — Calyxra`}>
            <div className="container" style={{ maxWidth: 1100 }}>
                {/* Breadcrumb */}
                <div style={{ marginBottom: 8 }}>
                    <a href={`/dashboard/stores/${id}`} style={{ color: 'var(--c-gray-500)', fontSize: 13, textDecoration: 'none' }}>&larr; Back to {store?.name}</a>
                </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, margin: '0 0 4px' }}>Customer Quality</h1>
                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Analyze which campaigns drive loyal repeaters vs. one-time buyers.</p>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Total Acquired</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{totalCustomers.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #3730a3' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>New Customers</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#3730a3' }}>{totalNew.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #10b981' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Returning Customers</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#10b981' }}>{totalReturning.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Avg Repeat Rate</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{repeatRate}%</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Acquisition Split by Campaign</h3>
                            <Bar data={chartData} options={{ responsive: true, scales: { x: { stacked: true, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }, y: { stacked: true } } }} />
                        </div>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Overall Split</h3>
                            <div style={{ width: 200, margin: '0 auto' }}>
                                <Doughnut data={{
                                    labels: ['New', 'Returning'],
                                    datasets: [{ data: [totalNew, totalReturning], backgroundColor: ['#3730a3', '#10b981'] }]
                                }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Campaign Breakdown</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                    <th style={{ padding: '10px', color: '#6b7280' }}>Campaign</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>Total Acquired</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>New</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>Returning</th>
                                    <th style={{ padding: '10px', color: '#6b7280', textAlign: 'right' }}>Repeat Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((c, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px', fontWeight: 500 }}>{c.campaignName}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{c.totalCustomers.toLocaleString()}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#3730a3' }}>{c.newCustomers.toLocaleString()}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#10b981' }}>{c.returningCustomers.toLocaleString()}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: parseFloat(c.returningPct) > 10 ? '#10b981' : '#111827' }}>{c.returningPct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
        </DashboardLayout>
    );
}
