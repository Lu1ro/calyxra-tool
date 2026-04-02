// components/EmptyState.js
// Onboarding empty state with progress checklist

import { useRouter } from 'next/router';

export default function EmptyState({ store, storeId, onTrySample }) {
    const router = useRouter();
    const hasShopify = store?.connections?.some(c => c.platform === 'shopify');
    const hasAdPlatforms = store?.connections?.some(c => ['meta', 'google'].includes(c.platform));

    const steps = [
        { label: 'Connect Store', done: hasShopify, link: !hasShopify ? `/dashboard/stores/${storeId}/settings` : null, icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        )},
        { label: 'Connect Ad Platforms', done: hasAdPlatforms, link: !hasAdPlatforms ? `/dashboard/stores/${storeId}/settings` : null, icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        )},
        { label: 'Run First Reconciliation', done: false, icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        )},
    ];

    const completedCount = steps.filter(s => s.done).length;
    const progressPct = (completedCount / steps.length) * 100;

    return (
        <div className="animate-fade-in" style={{
            maxWidth: 520,
            margin: '40px auto',
            background: 'var(--c-white)',
            borderRadius: 16,
            padding: '48px 40px 40px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
            border: '1px solid var(--c-gray-200)',
        }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                {/* Abstract illustration */}
                <div style={{
                    width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, rgba(0,184,148,0.1) 0%, rgba(0,184,148,0.05) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(0,184,148,0.12)',
                }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                </div>
                <h2 style={{
                    fontSize: 20, fontWeight: 700, margin: '0 0 8px',
                    color: 'var(--c-gray-900)', letterSpacing: '-0.02em',
                }}>
                    Get Started
                </h2>
                <p style={{
                    margin: 0, fontSize: 14, color: 'var(--c-gray-400)',
                    lineHeight: 1.5, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
                }}>
                    Complete these steps to unlock your revenue intelligence.
                </p>
                {/* Progress bar */}
                <div style={{
                    maxWidth: 240, margin: '20px auto 0', height: 4, borderRadius: 2,
                    background: 'var(--c-gray-100)', overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${progressPct}%`,
                        height: '100%', borderRadius: 2,
                        background: 'var(--color-primary)',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                </div>
                <p style={{
                    marginTop: 8, fontSize: 12, color: 'var(--c-gray-400)', fontWeight: 500,
                }}>
                    {completedCount} of {steps.length} complete
                </p>
            </div>

            <div style={{
                maxWidth: 420, margin: '0 auto 32px',
                background: 'var(--c-gray-50)',
                borderRadius: 12,
                border: '1px solid var(--c-gray-100)',
                overflow: 'hidden',
            }}>
                {steps.map((step, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px',
                        borderBottom: i < steps.length - 1 ? '1px solid var(--c-gray-100)' : 'none',
                        transition: 'background 150ms',
                    }}>
                        <span style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: step.done ? 'rgba(0,184,148,0.1)' : 'var(--c-white)',
                            border: step.done ? '1px solid rgba(0,184,148,0.2)' : '1px solid var(--c-gray-200)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: step.done ? 'var(--color-primary)' : 'var(--c-gray-300)',
                            flexShrink: 0,
                            transition: 'all 200ms',
                        }}>
                            {step.done ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : step.icon}
                        </span>
                        <span style={{
                            fontSize: 14,
                            color: step.done ? 'var(--c-gray-400)' : 'var(--c-gray-800)',
                            fontWeight: step.done ? 400 : 500,
                            textDecoration: step.done ? 'line-through' : 'none',
                            letterSpacing: '-0.01em',
                        }}>
                            {step.label}
                        </span>
                        {step.link && !step.done && (
                            <a href={step.link} onClick={(e) => { e.preventDefault(); router.push(step.link); }} style={{
                                marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                                color: 'var(--color-primary)', textDecoration: 'none',
                                cursor: 'pointer',
                            }}>
                                Set up →
                            </a>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => router.push(`/dashboard/stores/${storeId}/settings`)} style={{
                    padding: '10px 24px', fontSize: 14, borderRadius: 10,
                    boxShadow: '0 2px 8px rgba(0,184,148,0.2)',
                    width: 220,
                }}>
                    Connect Platforms
                </button>
                <button className="btn btn-secondary" onClick={onTrySample} style={{
                    padding: '10px 24px', fontSize: 14, borderRadius: 10,
                    width: 220,
                }}>
                    Try with Sample Data
                </button>
                <p style={{
                    marginTop: 4, fontSize: 12, color: 'var(--c-gray-400)',
                }}>
                    No API keys needed — we generate realistic demo data.
                </p>
            </div>
        </div>
    );
}
