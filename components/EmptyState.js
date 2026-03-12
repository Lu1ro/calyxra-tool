// components/EmptyState.js
// Onboarding empty state with progress checklist

export default function EmptyState({ store, storeId, onTrySample }) {
    const steps = [
        { label: 'Connect Store', done: true, icon: '🏪' },
        { label: 'Connect Ad Platforms', done: (store?.connections?.length || 0) > 0, icon: '📡' },
        { label: 'Connect Database (BigQuery)', done: !!store?.databaseConfig, icon: '🗄️', link: `/dashboard/stores/${storeId}/database` },
        { label: 'Run First Reconciliation', done: false, icon: '🚀' },
    ];

    const completedCount = steps.filter(s => s.done).length;

    return (
        <div className="card animate-fade-in" style={{ padding: 'var(--space-10)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: 48, marginBottom: 'var(--space-3)' }}>📊</div>
                <h2 className="heading-serif" style={{ fontSize: 'var(--text-xl)', margin: '0 0 var(--space-2)' }}>
                    Get Started
                </h2>
                <p className="text-muted text-md" style={{ margin: 0 }}>
                    Complete these steps to unlock your revenue intelligence.
                </p>
                {/* Progress bar */}
                <div style={{
                    maxWidth: 200, margin: '16px auto 0', height: 6, borderRadius: 3,
                    background: 'var(--c-gray-100)', overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${(completedCount / steps.length) * 100}%`,
                        height: '100%', borderRadius: 3,
                        background: 'var(--c-green)',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                    {completedCount} of {steps.length} complete
                </p>
            </div>

            <div style={{ maxWidth: 400, margin: '0 auto var(--space-6)' }}>
                {steps.map((step, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: '12px 16px',
                        borderBottom: i < steps.length - 1 ? '1px solid var(--c-gray-100)' : 'none',
                    }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: step.done ? 'var(--c-green-light)' : 'var(--c-gray-100)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'var(--text-md)', color: step.done ? 'var(--c-green)' : 'var(--c-gray-400)',
                            fontWeight: 700, flexShrink: 0,
                        }}>
                            {step.done ? '✓' : (i + 1)}
                        </span>
                        <span style={{
                            fontSize: 'var(--text-md)',
                            color: step.done ? 'var(--c-gray-500)' : 'var(--c-gray-900)',
                            fontWeight: step.done ? 400 : 500,
                            textDecoration: step.done ? 'line-through' : 'none',
                        }}>
                            {step.icon} {step.label}
                        </span>
                        {step.link && !step.done && (
                            <a href={step.link} className="text-sm font-semibold" style={{ marginLeft: 'auto', color: 'var(--c-green)' }}>
                                Set up →
                            </a>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={onTrySample}>
                    🧪 Try with Sample Data
                </button>
                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>
                    No API keys needed — we generate realistic demo data.
                </p>
            </div>
        </div>
    );
}
