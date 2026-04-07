import { useState } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const GREEN = '#1a5c3a';
const RED = '#dc2626';
const AMBER = '#f59e0b';
const LIGHT_GREEN = '#e6f7f4';

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color = GREEN, badge }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
      {badge && <div style={{ display: 'inline-block', marginTop: 8, padding: '2px 10px', borderRadius: 99, background: color === RED ? '#fee2e2' : LIGHT_GREEN, color, fontSize: 12, fontWeight: 600 }}>{badge}</div>}
    </div>
  );
}

// ─── Campaign Table ─────────────────────────────────────────────────────────
function CampaignTable({ campaigns }) {
  const flagColors = { red: RED, amber: AMBER, green: GREEN };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            {['Channel', 'Campaign', 'Spend', 'Reported Rev', 'Reported ROAS', 'Est. True Rev', 'True ROAS', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px' }}>
                📘 {c.channel}
              </td>
              <td style={{ padding: '12px', fontWeight: 500 }}>{c.campaignName}</td>
              <td style={{ padding: '12px' }}>${c.spend.toLocaleString()}</td>
              <td style={{ padding: '12px' }}>${c.purchaseValue.toLocaleString()}</td>
              <td style={{ padding: '12px', fontWeight: 600 }}>{c.reportedRoas}×</td>
              <td style={{ padding: '12px' }}>${(c.estimatedTrueRevenue || 0).toLocaleString()}</td>
              <td style={{ padding: '12px', fontWeight: 600, color: GREEN }}>{c.estimatedTrueRoas}×</td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: c.flagColor === 'red' ? '#fee2e2' : c.flagColor === 'amber' ? '#fef3c7' : LIGHT_GREEN,
                  color: flagColors[c.flagColor] || GREEN,
                }}>{c.flag}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Gap Calculator (Free, No Login) ────────────────────────────────────────
function GapCalculator() {
  const [inputs, setInputs] = useState({ metaRevenue: '', shopifyRevenue: '', adSpend: '' });
  const [result, setResult] = useState(null);

  const set = (k, v) => setInputs(f => ({ ...f, [k]: v }));
  const fmt = n => '$' + Math.round(n).toLocaleString();

  function calculate() {
    const meta = parseFloat(inputs.metaRevenue) || 0;
    const shopify = parseFloat(inputs.shopifyRevenue) || 0;
    const spend = parseFloat(inputs.adSpend) || 0;
    if (!meta || !shopify || !spend) return;
    const phantom = Math.max(0, meta - shopify);
    const gapPct = meta > 0 ? (phantom / meta) * 100 : 0;
    const platformRoas = spend > 0 ? meta / spend : 0;
    const realRoas = spend > 0 ? shopify / spend : 0;
    const overpayPct = realRoas > 0 ? ((platformRoas - realRoas) / realRoas) * 100 : 0;
    setResult({ phantom, gapPct, platformRoas, realRoas, overpayPct });
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb',
    borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', marginBottom: 48 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 6px', fontFamily: "'DM Serif Display', serif", color: GREEN, fontSize: 26, textAlign: 'center' }}>
          Find your phantom revenue in 30 seconds
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
          Enter your last 30 days numbers. No login needed.
        </p>

        <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              📘 Meta reported revenue (last 30 days)
            </label>
            <input style={inputStyle} type="number" placeholder="e.g. 245000"
              value={inputs.metaRevenue} onChange={e => set('metaRevenue', e.target.value)}
              onFocus={e => e.target.style.borderColor = GREEN}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              🛒 Shopify net revenue (last 30 days)
            </label>
            <input style={inputStyle} type="number" placeholder="e.g. 162500"
              value={inputs.shopifyRevenue} onChange={e => set('shopifyRevenue', e.target.value)}
              onFocus={e => e.target.style.borderColor = GREEN}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              💰 Monthly ad spend
            </label>
            <input style={inputStyle} type="number" placeholder="e.g. 62000"
              value={inputs.adSpend} onChange={e => set('adSpend', e.target.value)}
              onFocus={e => e.target.style.borderColor = GREEN}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
        </div>

        <button onClick={calculate} style={{
          width: '100%', background: GREEN, color: '#fff', border: 'none', borderRadius: 10,
          padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', transition: 'opacity 0.2s',
        }}>
          Calculate My Phantom Revenue →
        </button>

        {result && (
          <div style={{ marginTop: 24 }}>
            {/* Results Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Phantom Revenue</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: RED, fontFamily: "'DM Serif Display', serif" }}>{fmt(result.phantom)}</div>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Gap</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309', fontFamily: "'DM Serif Display', serif" }}>{result.gapPct.toFixed(1)}%</div>
              </div>
              <div style={{ background: '#e6f7f4', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#065f46', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Your Real ROAS</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: GREEN, fontFamily: "'DM Serif Display', serif" }}>{result.realRoas.toFixed(2)}×</div>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Platform ROAS</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#6b7280', fontFamily: "'DM Serif Display', serif" }}>{result.platformRoas.toFixed(2)}×</div>
              </div>
            </div>

            {/* Overpay warning */}
            {result.overpayPct > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '14px 18px', textAlign: 'center', marginBottom: 16, border: '1px solid #fecaca' }}>
                <span style={{ color: RED, fontWeight: 700, fontSize: 15 }}>
                  ⚠️ You may be overpaying by {result.overpayPct.toFixed(0)}% based on inflated ROAS
                </span>
              </div>
            )}

            {/* CTA */}
            <a href={(process.env.NEXT_PUBLIC_MARKETING_SITE_URL || 'https://www.calyxra.com') + '/#pricing'} style={{
              display: 'block', textAlign: 'center', background: GREEN, color: '#fff',
              padding: '16px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15,
              transition: 'opacity 0.2s',
            }}>
              See exactly where this comes from → Start Free
            </a>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
              Full Shopify + Meta reconciliation with waterfall breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pricing Section ────────────────────────────────────────────────────────
function PricingSection() {
  const cardStyle = {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
    flex: 1, minWidth: 280,
  };
  const checkStyle = { fontSize: 14, color: '#374151', padding: '6px 0', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 10 };
  const dot = (color = GREEN) => <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto 48px' }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#111827', textAlign: 'center', margin: '0 0 8px' }}>
        Simple pricing. Real numbers.
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
        No contracts. No pixels. Cancel anytime.
      </p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Free */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Free</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            $0<span style={{ fontSize: 18, fontWeight: 400, color: '#6b7280' }}>/mo</span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>1 store, forever free</div>
          <div style={{ display: 'grid', gap: 2, marginBottom: 24 }}>
            <div style={checkStyle}>{dot('#94a3b8')} Phantom revenue detection</div>
            <div style={checkStyle}>{dot('#94a3b8')} True ROAS (aggregate)</div>
            <div style={checkStyle}>{dot('#94a3b8')} Gap breakdown (refunds, discounts)</div>
            <div style={checkStyle}>{dot('#94a3b8')} Shopify + Meta connection</div>
            <div style={checkStyle}>{dot('#94a3b8')} Revenue leak alert</div>
          </div>
          <a href="/register" style={{
            display: 'block', textAlign: 'center', background: '#fff', color: GREEN,
            padding: '14px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
            border: `2px solid ${GREEN}`, transition: 'all 0.2s',
          }}>
            Get Started Free →
          </a>
        </div>

        {/* Paid */}
        <div style={{ ...cardStyle, borderColor: GREEN, borderWidth: 2, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: GREEN, color: '#fff', padding: '4px 16px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
          }}>
            MOST POPULAR
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Paid</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            $149<span style={{ fontSize: 18, fontWeight: 400, color: '#6b7280' }}>/mo</span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>$119/mo billed annually</div>
          <div style={{ display: 'grid', gap: 2, marginBottom: 24 }}>
            <div style={checkStyle}>{dot()} Everything in Free</div>
            <div style={checkStyle}>{dot()} Up to 3 stores</div>
            <div style={checkStyle}>{dot()} Per-campaign True ROAS breakdown</div>
            <div style={checkStyle}>{dot()} AI budget optimizer (pause/scale/reduce)</div>
            <div style={checkStyle}>{dot()} Google Ads connection</div>
            <div style={checkStyle}>{dot()} Revenue waterfall & trend charts</div>
            <div style={checkStyle}>{dot()} LTV-based ROAS & cohort analysis</div>
            <div style={checkStyle}>{dot()} PDF report export</div>
            <div style={checkStyle}>{dot()} Real-time alerts</div>
          </div>
          <a href="/register" style={{
            display: 'block', textAlign: 'center', background: GREEN, color: '#fff',
            padding: '14px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
            transition: 'opacity 0.2s',
          }}>
            Start 14-Day Free Trial →
          </a>
        </div>

        {/* Agency */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Agency</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            $399<span style={{ fontSize: 18, fontWeight: 400, color: '#6b7280' }}>/mo</span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>$319/mo billed annually</div>
          <div style={{ display: 'grid', gap: 2, marginBottom: 24 }}>
            <div style={checkStyle}>{dot('#818cf8')} Everything in Paid</div>
            <div style={checkStyle}>{dot('#818cf8')} Up to 50 stores</div>
            <div style={checkStyle}>{dot('#818cf8')} Multi-store portfolio dashboard</div>
            <div style={checkStyle}>{dot('#818cf8')} White-label PDF reports</div>
            <div style={checkStyle}>{dot('#818cf8')} Cross-store benchmarking</div>
            <div style={checkStyle}>{dot('#818cf8')} Aggregated portfolio KPIs</div>
            <div style={checkStyle}>{dot('#818cf8')} Custom branding (logo, colors)</div>
            <div style={checkStyle}>{dot('#818cf8')} Direct founder support (Slack)</div>
          </div>
          <a href="/register" style={{
            display: 'block', textAlign: 'center', background: '#fff', color: '#818cf8',
            padding: '14px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
            border: '2px solid #818cf8', transition: 'all 0.2s',
          }}>
            Contact Sales →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Connection Form ────────────────────────────────────────────────────────
function ConnectionForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    shopifyDomain: '', shopifyApiKey: '',
    metaAccessToken: '', metaAdAccountId: '',
    dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <h2 style={{ margin: '0 0 8px', fontFamily: "'DM Serif Display', serif", color: GREEN }}>Connect Your Data</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>Enter your API credentials to generate a live reconciliation report.</p>

      <div style={{ background: '#f8fafc', borderLeft: '4px solid #94a3b8', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>🔒 Security & Privacy Guarantee</div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
          Read-only access only. Data is processed entirely in-memory to generate this report and is <strong>never stored</strong> or saved to our servers.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16, border: `1px solid ${LIGHT_GREEN}` }}>
          <div style={{ fontWeight: 600, color: GREEN, marginBottom: 12, fontSize: 13 }}>🛒 SHOPIFY</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Store Domain</label>
              <input style={inputStyle} placeholder="my-store.myshopify.com" value={form.shopifyDomain} onChange={e => set('shopifyDomain', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Admin API Access Token</label>
              <input style={inputStyle} type="password" placeholder="shpat_..." value={form.shopifyApiKey} onChange={e => set('shopifyApiKey', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ background: '#eff6ff', borderRadius: 8, padding: 16, border: '1px solid #bfdbfe' }}>
          <div style={{ fontWeight: 600, color: '#1d4ed8', margin: '0 0 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span>📘 META ADS</span>
            <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>(Optional)</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Access Token</label>
              <input style={inputStyle} type="password" placeholder="EAABsbCS..." value={form.metaAccessToken} onChange={e => set('metaAccessToken', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Ad Account ID</label>
              <input style={inputStyle} placeholder="act_123456789" value={form.metaAdAccountId} onChange={e => set('metaAdAccountId', e.target.value)} />
            </div>
          </div>
        </div>




        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Date From</label>
            <input style={inputStyle} type="date" value={form.dateFrom} onChange={e => set('dateFrom', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 4 }}>Date To</label>
            <input style={inputStyle} type="date" value={form.dateTo} onChange={e => set('dateTo', e.target.value)} />
          </div>
        </div>

        <button
          onClick={() => onSubmit(form)}
          disabled={loading}
          style={{
            background: GREEN, color: '#fff', border: 'none', borderRadius: 8,
            padding: '14px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif',
          }}>
          {loading ? 'Fetching data…' : 'Generate Report →'}
        </button>

        <button
          onClick={() => onSubmit({ useSampleData: true })}
          disabled={loading}
          style={{
            background: 'transparent', color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 8,
            padding: '12px', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>
          Try with sample data
        </button>

        <div style={{ marginTop: 20, padding: '14px 20px', background: '#f0fdf4', borderRadius: 8, border: `1px solid ${LIGHT_GREEN}`, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#374151' }}>Want to automate this? </span>
          <a href="/register" style={{ fontSize: 13, fontWeight: 600, color: GREEN, textDecoration: 'none' }}>Create a free account →</a>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ report, meta, onReset }) {
  const fmt = n => '$' + Math.round(n).toLocaleString();
  const pct = n => n.toFixed(1) + '%';

  const waterfallData = {
    labels: ['Platforms Reported', 'Discounts', 'Refunds', 'Chargebacks', 'Platform Overlap', 'Shopify Net'],
    datasets: [{
      label: 'Revenue',
      data: [
        report.metaReportedRevenue,
        -report.gapDecomposition[0].value,
        -report.gapDecomposition[1].value,
        -report.gapDecomposition[2].value,
        -report.gapDecomposition[3].value,
        report.shopifyNetRevenue,
      ],
      backgroundColor: [GREEN, RED, RED, RED, RED, GREEN],
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: v => '$' + v.toLocaleString() } } },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", color: GREEN, fontSize: 22 }}>
            Reconciliation Report {meta.isDemo && <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>(Sample Data)</span>}
          </h2>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            {meta.dateFrom} → {meta.dateTo} · Generated {new Date(meta.generatedAt).toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => alert('PDF Export requires a Paid subscription — $149/mo.')} style={{ background: '#fff', border: `1px solid #d1d5db`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>📥</span> Download PDF
          </button>
          <button onClick={onReset} style={{ background: 'transparent', border: `1px solid #d1d5db`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            ← New Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard label="Platform Reported Revenue" value={fmt(report.metaReportedRevenue)} sub={`ROAS: ${report.reportedRoas}×`} color={GREEN} />
        <KPICard label="Shopify Net Revenue" value={fmt(report.shopifyNetRevenue)} sub={`True ROAS: ${report.trueRoas}×`} color={GREEN} />
        <KPICard label="Phantom Revenue" value={fmt(report.phantomRevenue)} sub={`${pct(report.phantomPct)} of reported`} color={RED} badge={`ROAS overstated by ${report.roasOverstatement}×`} />
        <KPICard label="Budget at Risk" value={fmt(report.budgetAtRisk)} sub={`${fmt(report.annualizedPhantom)}/yr annualized`} color={AMBER} />
      </div>

      {/* Waterfall Chart */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: 16 }}>Revenue Waterfall — Where the Gap Comes From</h3>
        <Bar data={waterfallData} options={chartOptions} height={80} />
      </div>

      {/* Gap Decomposition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: 16 }}>Gap Decomposition</h3>
          {report.gapDecomposition.map((g, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < report.gapDecomposition.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <span style={{ color: '#374151', fontSize: 14 }}>
                {g.label}
                {g.label.includes('Overlap') && <span title="Sum of platform-reported revenue exceeds Shopify total by this amount. This happens when multiple platforms take credit for the same purchase." style={{ cursor: 'help', fontSize: 12, marginLeft: 6, color: '#9ca3af' }}>ⓘ</span>}
              </span>
              <span style={{ fontWeight: 600, color: RED, fontSize: 14 }}>-{fmt(g.value)} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({pct(g.pct)})</span></span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: 16 }}>ROAS Reality Check</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Platform Reported</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', serif" }}>{report.reportedRoas}×</div>
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>True ROAS (Shopify Net)</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: GREEN, fontFamily: "'DM Serif Display', serif" }}>{report.trueRoas}×</div>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ color: RED, fontWeight: 600, fontSize: 14 }}>Overstatement: {report.roasOverstatement}× ({pct(report.phantomPct)} inflated)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: 16 }}>Campaign-Level Breakdown</h3>
        <CampaignTable campaigns={report.campaigns} />
      </div>

      {/* Recommendations */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24, borderTop: `4px solid ${GREEN}` }}>
        <h3 style={{ margin: '0 0 16px', color: '#111827', fontSize: 16 }}>Recommended Actions</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {report.campaigns.filter(c => c.flagColor === 'red').slice(0, 2).map((c, i) => (
            <div key={`red-${i}`} style={{ background: '#fee2e2', borderRadius: 8, padding: '12px 16px', borderLeft: `4px solid ${RED}` }}>
              <span style={{ fontWeight: 600, color: RED, display: 'block', marginBottom: 4 }}>
                🔴 {c.flag === 'Unprofitable' ? 'Pause Immediately' : 'Stop or Restructure'}: {c.campaignName}
              </span>
              <span style={{ fontSize: 14, color: '#7f1d1d' }}>
                {c.flag === 'Unprofitable'
                  ? <>True ROAS is <strong>{c.estimatedTrueRoas}×</strong> (below 1.0×). This campaign is losing money after refunds and discounts. Every dollar spent here is wasted.</>
                  : <>True ROAS is only <strong>{c.estimatedTrueRoas}×</strong> (reported as {c.reportedRoas}×, inflated {c.inflationRatio}×). Barely profitable and heavily overstated. Scaling this will destroy margin.</>
                }
              </span>
            </div>
          ))}
          {report.campaigns.filter(c => c.flagColor === 'amber').slice(0, 2).map((c, i) => (
            <div key={`amber-${i}`} style={{ background: '#fef3c7', borderRadius: 8, padding: '12px 16px', borderLeft: `4px solid ${AMBER}` }}>
              <span style={{ fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 4 }}>
                🟡 {c.flag === 'Inflated but profitable' ? 'Keep Running, But Don\'t Trust Numbers' : 'Investigate'}: {c.campaignName}
              </span>
              <span style={{ fontSize: 14, color: '#92400e' }}>
                {c.flag === 'Inflated but profitable'
                  ? <>True ROAS ({c.estimatedTrueRoas}×) is still strong, but platform reports {c.reportedRoas}× (inflated {c.inflationRatio}×). Don't kill this campaign, but don't use the reported numbers for scaling decisions.</>
                  : <>True ROAS ({c.estimatedTrueRoas}×) is borderline. Platform inflation is {c.inflationRatio}×. Check the search terms report or audience overlap to ensure incrementality.</>
                }
              </span>
            </div>
          ))}
          {report.campaigns.filter(c => c.flagColor === 'green').slice(0, 1).map((c, i) => (
            <div key={`green-${i}`} style={{ background: '#e6f7f4', borderRadius: 8, padding: '12px 16px', borderLeft: `4px solid ${GREEN}` }}>
              <span style={{ fontWeight: 600, color: GREEN, display: 'block', marginBottom: 4 }}>🟢 Safe to Scale: {c.campaignName}</span>
              <span style={{ fontSize: 14, color: '#065f46' }}>True ROAS ({c.estimatedTrueRoas}×) is healthy and reporting is accurate (inflation only {c.inflationRatio}×). This is a solid candidate for budget increases.</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: GREEN, borderRadius: 12, padding: 32, textAlign: 'center', color: '#fff' }}>
        <h3 style={{ margin: '0 0 8px', fontFamily: "'DM Serif Display', serif", fontSize: 22 }}>
          Your actual revenue is {fmt(report.shopifyNetRevenue)} — {fmt(report.phantomRevenue)} less than reported.
        </h3>
        <p style={{ margin: '0 0 20px', opacity: 0.85, fontSize: 15 }}>Stop making scaling decisions on inflated numbers.</p>
        <a href={(process.env.NEXT_PUBLIC_MARKETING_SITE_URL || 'https://www.calyxra.com') + '/#pricing'} style={{
          display: 'inline-block', background: '#fff', color: GREEN,
          padding: '14px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 15,
        }}>→ Start Free Scan</a>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  async function handleSubmit(formData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Report failed');
      setReport(json.report);
      setMeta(json.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const headerStyle = {
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    height: 60,
    gap: 12,
  };

  return (
    <>
      <Head>
        <title>Calyxra — Revenue Reconciliation</title>
        <meta name="description" content="Reconcile your Meta reported revenue against Shopify net revenue. Find phantom revenue in minutes." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={containerStyle}>
        {/* Navbar */}
        <div style={headerStyle}>
          <img src="/logo.png" alt="Calyxra" style={{ height: 36, width: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: GREEN, fontWeight: 400 }}>Calyxra.</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>Revenue Reconciliation Tool</span>
          <a href="/login" style={{
            marginLeft: 16, padding: '6px 16px', background: GREEN, color: '#fff',
            borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>Login to Dashboard →</a>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
          {!report ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: '#111827', margin: '0 0 12px' }}>
                  What's the <span style={{ color: GREEN }}>real</span> number?
                </h1>
                <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
                  Ad platforms overstate your revenue. Find out by how much — in 30 seconds.
                </p>
              </div>
              <GapCalculator />
              <PricingSection />
              <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 32 }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#111827', margin: '0 0 8px' }}>
                  Already a client? Run a full reconciliation below
                </h2>
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Connect your APIs for a detailed campaign-level breakdown</p>
              </div>
              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: RED, fontSize: 14, maxWidth: 600, margin: '0 auto 16px' }}>
                  ⚠️ {error}
                </div>
              )}
              <ConnectionForm onSubmit={handleSubmit} loading={loading} />
            </>
          ) : (
            <Dashboard report={report} meta={meta} onReset={() => { setReport(null); setMeta(null); }} />
          )}
        </div>
      </div>
    </>
  );
}
