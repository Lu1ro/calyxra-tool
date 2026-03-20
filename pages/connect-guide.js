// pages/connect-guide.js
// Client-facing guide: How to get API tokens for each platform
import Head from 'next/head';

const GREEN = '#00b894';

const steps = [
    {
        platform: 'Shopify',
        icon: '🟢',
        color: GREEN,
        time: '~3 minutes',
        fields: ['Admin API Access Token'],
        steps: [
            'Log in to your Shopify admin (your-store.myshopify.com/admin)',
            'Go to Settings → Apps and sales channels → Develop apps',
            'Click "Create an app" → name it "Calyxra" (or anything)',
            'Click "Configure Admin API scopes"',
            'Select: read_orders, read_products, read_customers → Save',
            'Click "Install app" → confirm',
            'Go to "API credentials" tab → copy the Admin API access token',
            'Paste it in Calyxra when connecting your store',
        ],
        notes: 'This token gives read-only access to your orders. We never modify any data in your store.',
    },
    {
        platform: 'Meta Ads',
        icon: '📘',
        color: '#1877f2',
        time: '~5 minutes',
        fields: ['Access Token', 'Ad Account ID'],
        steps: [
            'Go to developers.facebook.com/tools/explorer',
            'Select your app (or "Meta App" at the top)',
            'Under "User Token", click "Generate Access Token"',
            'Grant the permission: ads_read',
            'Copy the Access Token',
            'For Ad Account ID: go to Business Manager → Ad Accounts → copy the ID (starts with act_)',
            'Paste both values in Calyxra',
        ],
        notes: 'The token expires after ~60 days. We\'ll notify you when it needs renewal. For long-lived tokens, ask us about OAuth setup.',
    },
    {
        platform: 'Google Ads',
        icon: '🔍',
        color: '#ea4335',
        time: '~10 minutes (one-time setup)',
        fields: ['Developer Token / OAuth Token', 'Customer ID'],
        steps: [
            'Go to Google Ads → click Settings (gear icon) → Account number',
            'Copy the Customer ID (format: 123-456-7890)',
            'For OAuth token: go to developers.google.com/oauthplayground',
            'Select Google Ads API v18 → Authorize APIs',
            'Exchange the code for tokens → copy the Access Token',
            'Paste both values in Calyxra',
        ],
        notes: 'Google Ads API access requires a Google Ads Manager account. If you don\'t have one, skip Google Ads — we support Meta as primary.',
    },
    {
        platform: 'TikTok Ads',
        icon: '🎵',
        color: '#111',
        time: '~5 minutes',
        fields: ['Access Token', 'Advertiser ID'],
        steps: [
            'Go to ads.tiktok.com → log in to your TikTok Ads Manager',
            'Click your profile → Account Info → copy the Advertiser ID',
            'For Access Token: go to TikTok Marketing API portal',
            'Create an app → get the Access Token from the app dashboard',
            'Paste both values in Calyxra',
        ],
        notes: 'TikTok access tokens are long-lived. We only need read access to campaign reporting data.',
    },
];

export default function ConnectGuide() {
    return (
        <>
            <Head>
                <title>How to Connect — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: GREEN }}>Calyxra.</span>
                    <a href="/login" style={{ color: GREEN, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Login →</a>
                </div>

                <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
                    <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, margin: '0 0 8px' }}>
                        How to Connect Your Platforms
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
                        Follow these steps to connect your Shopify store and ad platforms.
                        <br />We only need <strong>read-only</strong> access — your data is encrypted with AES-256 and never shared.
                    </p>

                    {/* Minimum requirements */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 32, fontSize: 14 }}>
                        <strong>Minimum required:</strong> Shopify + at least 1 ad platform (Meta recommended).
                        <br />Google Ads and TikTok are optional.
                    </div>

                    {steps.map((s, i) => (
                        <div key={i} style={{
                            background: '#fff', borderRadius: 12, padding: 24,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20,
                            borderLeft: `4px solid ${s.color}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, margin: 0 }}>
                                    {s.icon} {s.platform}
                                </h2>
                                <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
                                    {s.time}
                                </span>
                            </div>

                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                                Fields needed: {s.fields.map((f, j) => (
                                    <span key={j} style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: 4, marginLeft: 4, fontWeight: 500 }}>{f}</span>
                                ))}
                            </div>

                            <ol style={{ paddingLeft: 20, margin: '0 0 12px', fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
                                {s.steps.map((step, j) => (
                                    <li key={j}>{step}</li>
                                ))}
                            </ol>

                            <div style={{ background: '#fffbeb', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
                                💡 {s.notes}
                            </div>
                        </div>
                    ))}

                    {/* CTA */}
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                            Have your tokens ready? Connect them now:
                        </p>
                        <a href="/dashboard" style={{
                            display: 'inline-block', padding: '12px 32px',
                            background: GREEN, color: '#fff', borderRadius: 8,
                            fontSize: 15, fontWeight: 600, textDecoration: 'none',
                        }}>
                            Go to Dashboard →
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
