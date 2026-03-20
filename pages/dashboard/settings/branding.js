// pages/dashboard/settings/branding.js
// White-label branding settings + Custom KPI configuration + Klaviyo integration

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const GREEN = '#00b894';

export default function BrandingSettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form state
    const [brandName, setBrandName] = useState('');
    const [brandColor, setBrandColor] = useState('#00b894');
    const [logoUrl, setLogoUrl] = useState('');
    const [reportHeader, setReportHeader] = useState('');
    const [reportFooter, setReportFooter] = useState('');
    const [klaviyoKey, setKlaviyoKey] = useState('');
    const [hasKlaviyo, setHasKlaviyo] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status]);

    useEffect(() => {
        if (session) fetchSettings();
    }, [session]);

    const fetchSettings = async () => {
        const res = await fetch('/api/agency/settings');
        const data = await res.json();
        setSettings(data);
        setBrandName(data.brandName || '');
        setBrandColor(data.brandColor || '#00b894');
        setLogoUrl(data.logoUrl || '');
        setReportHeader(data.reportHeader || '');
        setReportFooter(data.reportFooter || '');
        setHasKlaviyo(data.hasKlaviyo || false);
    };

    const save = async () => {
        setSaving(true);
        const body = { brandName, brandColor, logoUrl, reportHeader, reportFooter };
        if (klaviyoKey) body.klaviyoApiKey = klaviyoKey;
        await fetch('/api/agency/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>;

    return (
        <>
            <Head>
                <title>Settings — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Navbar */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer', color: '#6b7280', fontSize: 13 }}>← Dashboard</span>
                        <span style={{ color: '#d1d5db' }}>|</span>
                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: GREEN }}>⚙️ Agency Settings</span>
                    </div>
                    {session?.user?.tier === 'pro' && (
                        <span style={{ background: '#111827', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>PRO</span>
                    )}
                </div>

                <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
                    {/* White-Label Branding */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>🎨 White-Label Branding</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Customize how your reports look to clients. Replace Calyxra branding with your own.</p>

                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Brand Name</label>
                                <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Agency Name" style={inputStyle} />
                                <span style={hintStyle}>Replaces "Calyxra" in all exports and reports</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Logo URL</label>
                                    <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://youragency.com/logo.png" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Brand Color</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                                            style={{ width: 44, height: 38, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }} />
                                        <input value={brandColor} onChange={e => setBrandColor(e.target.value)} style={{ ...inputStyle, width: 100 }} />
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px dashed #d1d5db' }}>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Preview</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `3px solid ${brandColor}` }}>
                                    {logoUrl && <img src={logoUrl} style={{ height: 32 }} alt="Logo" onError={(e) => e.target.style.display = 'none'} />}
                                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: brandColor }}>{brandName || 'Your Agency'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Text */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>📄 Report Customization</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Add custom text to the top and bottom of exported PDF reports.</p>

                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Report Header Text</label>
                                <textarea value={reportHeader} onChange={e => setReportHeader(e.target.value)}
                                    placeholder="e.g. Confidential — Prepared exclusively for [Client Name]"
                                    rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Report Footer Text</label>
                                <textarea value={reportFooter} onChange={e => setReportFooter(e.target.value)}
                                    placeholder="e.g. © 2026 Your Agency. All rights reserved."
                                    rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                        </div>
                    </div>

                    {/* Klaviyo Integration */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>📧 Klaviyo Integration</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                            Connect Klaviyo to reconcile email/SMS attributed revenue against Shopify.
                            {hasKlaviyo && <span style={{ marginLeft: 8, color: GREEN, fontWeight: 600 }}>✅ Connected</span>}
                        </p>

                        <div>
                            <label style={labelStyle}>Klaviyo Private API Key</label>
                            <input value={klaviyoKey} onChange={e => setKlaviyoKey(e.target.value)}
                                placeholder={hasKlaviyo ? '••••••••••••••••••• (saved)' : 'pk_xxxxxxxxxxxxx'}
                                type="password" style={inputStyle} />
                            <span style={hintStyle}>Find this in Klaviyo → Settings → API Keys → Private Keys</span>
                        </div>
                    </div>

                    {/* Save */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={save} disabled={saving}
                            style={{
                                padding: '12px 32px', background: GREEN, color: '#fff',
                                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                            }}>
                            {saving ? 'Saving...' : '💾 Save Settings'}
                        </button>
                        {saved && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>✅ Settings saved!</span>}
                    </div>
                </div>
            </div>
        </>
    );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none',
};
const hintStyle = { display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 4 };
