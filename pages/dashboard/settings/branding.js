// pages/dashboard/settings/branding.js
// White-label branding settings + Custom KPI configuration + Klaviyo integration

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';

const GREEN = '#064E3B';

export default function BrandingSettingsPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [agencyTier, setAgencyTier] = useState(null);

    // Form state
    const [brandName, setBrandName] = useState('');
    const [brandColor, setBrandColor] = useState('#064E3B');
    const [logoUrl, setLogoUrl] = useState('');
    const [reportHeader, setReportHeader] = useState('');
    const [reportFooter, setReportFooter] = useState('');
    const [klaviyoKey, setKlaviyoKey] = useState('');
    const [hasKlaviyo, setHasKlaviyo] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [agencyName, setAgencyName] = useState('');
    const [agencyEmail, setAgencyEmail] = useState('');

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
        setAgencyTier(data.tier || 'free');
        setAgencyName(data.name || '');
        setAgencyEmail(session?.user?.email || '');
        setBrandName(data.brandName || '');
        setBrandColor(data.brandColor || '#064E3B');
        setLogoUrl(data.logoUrl || '');
        setReportHeader(data.reportHeader || '');
        setReportFooter(data.reportFooter || '');
        setHasKlaviyo(data.hasKlaviyo || false);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File too large. Maximum 2MB.');
            return;
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only PNG, JPG, SVG, and WebP files are allowed.');
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const res = await fetch('/api/agency/upload-logo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: reader.result,
                        fileType: file.type,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.logoUrl) {
                    setLogoUrl(data.logoUrl);
                } else {
                    alert(data.error || 'Upload failed');
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload failed. Please try again.');
            setUploading(false);
        }
    };

    const save = async () => {
        setSaving(true);
        const body = { name: agencyName, brandName, brandColor, logoUrl, reportHeader, reportFooter };
        if (klaviyoKey) body.klaviyoApiKey = klaviyoKey;
        await fetch('/api/agency/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        // Refresh session so navbar picks up the new name immediately
        await updateSession();
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const isFree = agencyTier === 'free';

    return (
        <DashboardLayout title="Settings — Calyxra">
            {status === 'loading' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: "'Inter', sans-serif" }}>Loading...</div>
            ) : (
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: "'Inter', sans-serif" }}>
                    {/* Account Profile */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>Account Profile</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Your name and email. The name is displayed in the top bar.</p>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Name</label>
                                <input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="Your name" style={inputStyle} />
                                <span style={hintStyle}>Displayed in the navigation bar and reports</span>
                            </div>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input value={agencyEmail} disabled style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }} />
                                <span style={hintStyle}>Email cannot be changed</span>
                            </div>
                        </div>
                    </div>

                    {/* White-Label Branding */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isFree ? 0 : 20 }}>
                            <div>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>White-Label Branding</h2>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Customize how your reports look to clients. Replace Calyxra branding with your own.</p>
                            </div>
                            {isFree && (
                                <span style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0,
                                }}>Pro</span>
                            )}
                        </div>

                        {isFree ? (
                            /* Free tier — locked state */
                            <div style={{ marginTop: 20 }}>
                                <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <div>
                                            <label style={labelStyle}>Brand Name</label>
                                            <input disabled placeholder="Your Agency Name" style={inputStyle} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
                                            <div>
                                                <label style={labelStyle}>Logo</label>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ padding: '10px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Upload Logo</span>
                                                    <span style={{ fontSize: 12, color: '#9ca3af' }}>or</span>
                                                    <input disabled placeholder="https://youragency.com/logo.png" style={{ ...inputStyle, flex: 1 }} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Brand Color</label>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <div style={{ width: 44, height: 38, background: '#064E3B', borderRadius: 6 }} />
                                                    <input disabled value="#064E3B" style={{ ...inputStyle, width: 100 }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, border: '1px dashed #d1d5db' }}>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Preview</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '3px solid #064E3B' }}>
                                                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#064E3B' }}>Your Agency</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.6)', borderRadius: 12, zIndex: 10,
                                    paddingTop: 40,
                                }}>
                                    <div style={{
                                        background: '#fff', borderRadius: 16, padding: '28px 40px', textAlign: 'center',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: 340,
                                    }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#064E3B" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                        </div>
                                        <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: '0 0 4px' }}>White-label is a paid feature</p>
                                        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>Upgrade to replace Calyxra branding with your own logo, colors, and report text.</p>
                                        <a href="https://calyxra.com/#pricing" target="_blank" rel="noopener noreferrer" style={{
                                            display: 'inline-block', padding: '10px 24px', borderRadius: 8,
                                            background: 'linear-gradient(135deg, #064E3B 0%, #043927 100%)',
                                            color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                                            transition: 'all 200ms',
                                        }}>Upgrade — $150/month</a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Paid tier — full access */
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Brand Name</label>
                                    <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Agency Name" style={inputStyle} />
                                    <span style={hintStyle}>Replaces &quot;Calyxra&quot; in all exports and reports</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Logo</label>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <label style={{
                                                padding: '10px 16px', background: '#f3f4f6', border: '1px solid #d1d5db',
                                                borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151',
                                                cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex',
                                                alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                                                opacity: uploading ? 0.6 : 1,
                                            }}>
                                                {uploading ? 'Uploading...' : 'Upload Logo'}
                                                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                                    onChange={handleLogoUpload} disabled={uploading}
                                                    style={{ display: 'none' }} />
                                            </label>
                                            <span style={{ fontSize: 12, color: '#9ca3af' }}>or</span>
                                            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                                                placeholder="https://youragency.com/logo.png"
                                                style={{ ...inputStyle, flex: 1 }} />
                                        </div>
                                        <span style={hintStyle}>PNG, JPG, SVG, or WebP — max 2MB</span>
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
                                        {logoUrl && <img src={logoUrl} style={{ height: 32 }} alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />}
                                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: brandColor }}>{brandName || 'Your Agency'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Report Text */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isFree ? 0 : 20 }}>
                            <div>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>Report Customization</h2>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Add custom text to the top and bottom of exported PDF reports.</p>
                            </div>
                            {isFree && (
                                <span style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0,
                                }}>Pro</span>
                            )}
                        </div>

                        {isFree ? (
                            <div style={{ marginTop: 20, filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Report Header Text</label>
                                        <textarea disabled placeholder="e.g. Confidential — Prepared for [Client]" rows={2} style={{ ...inputStyle, resize: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Report Footer Text</label>
                                        <textarea disabled placeholder="e.g. © 2026 Your Agency" rows={2} style={{ ...inputStyle, resize: 'none' }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                                        placeholder="e.g. &copy; 2026 Your Agency. All rights reserved."
                                        rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Klaviyo Integration — available for all tiers */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: '0 0 4px' }}>Klaviyo Integration</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                            Connect Klaviyo to reconcile email/SMS attributed revenue against Shopify.
                            {hasKlaviyo && <span style={{ marginLeft: 8, color: GREEN, fontWeight: 600 }}>Connected</span>}
                        </p>

                        <div>
                            <label style={labelStyle}>Klaviyo Private API Key</label>
                            <input value={klaviyoKey} onChange={e => setKlaviyoKey(e.target.value)}
                                placeholder={hasKlaviyo ? '(saved)' : 'pk_xxxxxxxxxxxxx'}
                                type="password" style={inputStyle} />
                            <span style={hintStyle}>Find this in Klaviyo &rarr; Settings &rarr; API Keys &rarr; Private Keys</span>
                        </div>
                    </div>

                    {/* Save */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={save} disabled={saving || isFree}
                            style={{
                                padding: '12px 32px', background: isFree ? '#d1d5db' : GREEN, color: '#fff',
                                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                cursor: saving || isFree ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                            }}>
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        {saved && <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>Settings saved!</span>}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none',
};
const hintStyle = { display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 4 };
