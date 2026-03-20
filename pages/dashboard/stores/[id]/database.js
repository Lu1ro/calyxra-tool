// pages/dashboard/stores/[id]/database.js
// Database Connector — Connect BigQuery / PostgreSQL for deeper reconciliation
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const GREEN = '#00b894';

const DB_TYPES = [
    {
        id: 'bigquery',
        name: 'Google BigQuery',
        icon: '🗄️',
        color: '#4285f4',
        description: 'Connect your BigQuery warehouse for order-level reconciliation, product margins, and customer LTV data.',
        fields: [
            { key: 'projectId', label: 'Project ID', placeholder: 'my-project-123', type: 'text' },
            { key: 'datasetId', label: 'Dataset', placeholder: 'shopify_data', type: 'text' },
            { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', placeholder: 'Paste your service account JSON...', type: 'textarea' },
        ],
        tables: ['orders', 'order_items', 'customers', 'products', 'refunds'],
    },
    {
        id: 'postgresql',
        name: 'PostgreSQL',
        icon: '🐘',
        color: '#336791',
        description: 'Connect your PostgreSQL database for custom data models, COGS data, and margin calculations.',
        fields: [
            { key: 'host', label: 'Host', placeholder: 'db.example.com', type: 'text' },
            { key: 'port', label: 'Port', placeholder: '5432', type: 'text' },
            { key: 'database', label: 'Database', placeholder: 'analytics', type: 'text' },
            { key: 'username', label: 'Username', placeholder: 'readonly_user', type: 'text' },
            { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
            { key: 'sslMode', label: 'SSL Mode', placeholder: 'require', type: 'text' },
        ],
        tables: ['orders', 'products', 'customers', 'cogs', 'margins'],
    },
    {
        id: 'mysql',
        name: 'MySQL / MariaDB',
        icon: '🔷',
        color: '#00758f',
        description: 'Connect MySQL for product cost data and custom analysis tables.',
        fields: [
            { key: 'host', label: 'Host', placeholder: 'db.example.com', type: 'text' },
            { key: 'port', label: 'Port', placeholder: '3306', type: 'text' },
            { key: 'database', label: 'Database', placeholder: 'shopify_sync', type: 'text' },
            { key: 'username', label: 'Username', placeholder: 'readonly_user', type: 'text' },
            { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
        ],
        tables: ['orders', 'products', 'customers'],
    },
];

const DATA_LAYERS = [
    { id: 'orders', icon: '📦', label: 'Order Data', desc: 'Order-level revenue for precise reconciliation', required: true },
    { id: 'products', icon: '🏷️', label: 'Product / COGS', desc: 'Cost of goods for true profit calculation', required: false },
    { id: 'customers', icon: '👥', label: 'Customer Data', desc: 'New vs returning, LTV, repeat rate by channel', required: false },
    { id: 'margins', icon: '📊', label: 'Margin Tables', desc: 'Gross margin % for profit reconciliation', required: false },
];

export default function DatabaseConnector() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query;

    const [store, setStore] = useState(null);
    const [selectedDb, setSelectedDb] = useState(null);
    const [config, setConfig] = useState({});
    const [tableMappings, setTableMappings] = useState({});
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [existingConnection, setExistingConnection] = useState(null);
    const [step, setStep] = useState(1); // 1: choose DB, 2: credentials, 3: table mapping, 4: test & save

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    useEffect(() => {
        if (session && id) fetchStore();
    }, [session, id]);

    const fetchStore = async () => {
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            const s = data.stores?.find(s => s.id === id);
            setStore(s);

            // Check if a DB connection already exists
            if (s?.databaseConfig) {
                try {
                    const dbConfig = JSON.parse(s.databaseConfig);
                    setExistingConnection(dbConfig);
                    setSelectedDb(DB_TYPES.find(d => d.id === dbConfig.type));
                    setConfig(dbConfig.credentials || {});
                    setTableMappings(dbConfig.tableMappings || {});
                } catch (err) {
                    console.error("Failed to parse database config:", err);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch(`/api/stores/${id}/database/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedDb.id,
                    credentials: config,
                    tableMappings
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setTestResult({
                    success: false,
                    message: `❌ Error: ${data.error || 'Connection failed'}`,
                    tables: [],
                    rowCounts: {}
                });
                setTesting(false);
                return;
            }

            setTestResult({
                success: data.success,
                message: data.message || (data.success ? '✅ Success' : '❌ Failed'),
                tables: data.tables || [],
                rowCounts: data.rowCounts || {},
            });
        } catch (e) {
            setTestResult({
                success: false,
                message: `❌ Connection request failed: ${e.message}`,
                tables: [],
                rowCounts: {}
            });
        }

        setTesting(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`/api/stores/${id}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    databaseConfig: JSON.stringify({
                        type: selectedDb.id,
                        credentials: config,
                        tableMappings,
                        connectedAt: new Date().toISOString(),
                    }),
                }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    if (status === 'loading') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;
    }

    return (
        <>
            <Head>
                <title>Database Connector — {store?.name || 'Store'} — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a href={`/dashboard/stores/${id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← {store?.name}</a>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>🗄️ Database Connector</span>
                    </div>
                    <a href={`/dashboard/stores/${id}/settings`} style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: 6, color: '#6b7280', textDecoration: 'none', fontSize: 12 }}>⚙️ Settings</a>
                </div>

                <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, margin: '0 0 8px' }}>Connect Your Data Warehouse</h1>
                    <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>
                        Connect a database to unlock Profit Reconciliation, Customer Quality analysis, and LTV-adjusted ROAS.
                        We use <strong>read-only access</strong> — your data is never modified.
                    </p>

                    {/* Existing connection banner */}
                    {existingConnection && (
                        <div style={{ background: '#d1fae5', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 24 }}>✅</span>
                            <div>
                                <div style={{ fontWeight: 600, color: GREEN }}>Database Connected</div>
                                <div style={{ fontSize: 13, color: '#374151' }}>
                                    {existingConnection.type?.toUpperCase()} · Connected {new Date(existingConnection.connectedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Progress */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
                        {[{ n: 1, label: 'Choose Database' }, { n: 2, label: 'Credentials' }, { n: 3, label: 'Map Tables' }, { n: 4, label: 'Test & Save' }].map(s => (
                            <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    background: step >= s.n ? GREEN : '#e5e7eb', color: step >= s.n ? '#fff' : '#9ca3af',
                                    fontSize: 14, fontWeight: 700, marginBottom: 6,
                                }}>{s.n}</div>
                                <div style={{ fontSize: 11, color: step >= s.n ? '#111827' : '#9ca3af', fontWeight: step === s.n ? 600 : 400 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Choose DB */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {DB_TYPES.map(db => (
                                <div
                                    key={db.id}
                                    onClick={() => { setSelectedDb(db); setStep(2); }}
                                    style={{
                                        background: '#fff', borderRadius: 12, padding: 20, cursor: 'pointer',
                                        border: selectedDb?.id === db.id ? `2px solid ${db.color}` : '2px solid transparent',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16,
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: 32, width: 50, textAlign: 'center' }}>{db.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{db.name}</div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{db.description}</div>
                                    </div>
                                    <span style={{ color: '#9ca3af', fontSize: 20 }}>→</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Credentials */}
                    {step === 2 && selectedDb && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <span style={{ fontSize: 24 }}>{selectedDb.icon}</span>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{selectedDb.name} Credentials</h3>
                            </div>

                            <div style={{ background: '#fffbeb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                                🔒 We recommend using a <strong>read-only</strong> database user. Your credentials are encrypted at rest.
                            </div>

                            {selectedDb.fields.map(f => (
                                <div key={f.key} style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                                    {f.type === 'textarea' ? (
                                        <textarea
                                            value={config[f.key] || ''}
                                            onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            rows={4}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                                        />
                                    ) : (
                                        <input
                                            type={f.type}
                                            value={config[f.key] || ''}
                                            onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
                                        />
                                    )}
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24 }}>
                                <button onClick={() => setStep(1)} style={{ padding: '8px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}>← Back</button>
                                <button onClick={() => setStep(3)} style={{ padding: '8px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Continue →</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Table Mapping */}
                    {step === 3 && selectedDb && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Map Your Data</h3>
                            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Tell us which tables contain your data. We'll use this for reconciliation and analytics.</p>

                            {DATA_LAYERS.map(layer => (
                                <div key={layer.id} style={{
                                    padding: 16, marginBottom: 12, borderRadius: 10,
                                    border: tableMappings[layer.id] ? `1px solid ${GREEN}` : '1px solid #e5e7eb',
                                    background: tableMappings[layer.id] ? '#f0fdf4' : '#fff',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <span style={{ fontSize: 20 }}>{layer.icon}</span>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{layer.label}</span>
                                            {layer.required && <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 600 }}>Required</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{layer.desc}</div>
                                    <input
                                        type="text"
                                        value={tableMappings[layer.id] || ''}
                                        onChange={e => setTableMappings({ ...tableMappings, [layer.id]: e.target.value })}
                                        placeholder={`e.g. public.${layer.id}`}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24 }}>
                                <button onClick={() => setStep(2)} style={{ padding: '8px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}>← Back</button>
                                <button onClick={() => setStep(4)} style={{ padding: '8px 20px', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Test Connection →</button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Test & Save */}
                    {step === 4 && selectedDb && (
                        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Test & Save Connection</h3>

                            {/* Summary */}
                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                    <span style={{ fontSize: 20 }}>{selectedDb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>{selectedDb.name}</div>
                                        <div style={{ color: '#6b7280', fontSize: 12 }}>{config[selectedDb.fields[0].key] || 'Not configured'}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    Tables mapped: {Object.entries(tableMappings).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testing || !selectedDb.fields.every(f => config[f.key]?.trim()?.length > 0)}
                                    style={{
                                        padding: '10px 20px', background: '#1e40af', color: '#fff', border: 'none',
                                        borderRadius: 8, fontSize: 14, fontWeight: 600,
                                        cursor: (testing || !selectedDb.fields.every(f => config[f.key]?.trim()?.length > 0)) ? 'not-allowed' : 'pointer',
                                        opacity: (testing || !selectedDb.fields.every(f => config[f.key]?.trim()?.length > 0)) ? 0.7 : 1,
                                    }}
                                    title={!selectedDb.fields.every(f => config[f.key]?.trim()?.length > 0) ? "Please fill out all credential fields first" : ""}
                                >
                                    {testing ? '⏳ Testing...' : '🔌 Test Connection'}
                                </button>
                            </div>

                            {/* Test Result */}
                            {testResult && (
                                <div style={{
                                    borderRadius: 10, padding: 16, marginBottom: 20,
                                    background: testResult.success ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: testResult.success ? GREEN : '#dc2626', marginBottom: 8 }}>
                                        {testResult.message}
                                    </div>
                                    {testResult.success && (
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            {testResult.tables.map(t => (
                                                <div key={t} style={{
                                                    background: '#fff', borderRadius: 6, padding: '8px 12px',
                                                    border: '1px solid #d1fae5', fontSize: 12,
                                                }}>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{t}</div>
                                                    <div style={{ color: '#6b7280' }}>{testResult.rowCounts[t] || '—'} rows</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* What this unlocks */}
                            <div style={{ background: '#ede9fe', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#5b21b6', marginBottom: 8 }}>🔓 What This Unlocks</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>📊 Profit Reconciliation (True Profit per Campaign)</div>
                                    <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>👥 Customer Quality by Channel</div>
                                    <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>💰 LTV-Adjusted ROAS</div>
                                    <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>🔁 Repeat Purchase Attribution</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                                <button onClick={() => setStep(3)} style={{ padding: '8px 20px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}>← Back</button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !testResult?.success}
                                    style={{
                                        padding: '10px 24px', background: testResult?.success ? GREEN : '#9ca3af', color: '#fff',
                                        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                        cursor: testResult?.success ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Connection'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Layers explanation */}
                    <div style={{ marginTop: 32, background: '#111827', borderRadius: 12, padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#fff' }}>How Database Connectivity Works</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 14 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🔌</div>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 4 }}>1. Connect</div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>Provide read-only credentials. We never modify your data.</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 14 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🧮</div>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 4 }}>2. Enrich</div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>We pull product margins, COGS, and customer data to enrich reconciliation.</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 14 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>💡</div>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 4 }}>3. Unlock</div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>See TRUE profit per campaign, not just revenue. Identify which channels drive real LTV.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
