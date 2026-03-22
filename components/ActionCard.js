// components/ActionCard.js
// Single optimizer action card with color-coded left border

export default function ActionCard({ action, onExecute, executing, formatCurrency }) {
    const styles = {
        PAUSE: { border: '#ef4444', bg: '#fef2f2', label: 'var(--c-red)', badge: 'badge-red' },
        REDUCE: { border: '#f59e0b', bg: '#fffbeb', label: '#92400e', badge: 'badge-amber' },
        SCALE: { border: '#10b981', bg: '#f0fdf4', label: '#059669', badge: 'badge-green' },
        MAINTAIN: { border: 'var(--c-gray-300)', bg: 'var(--c-gray-50)', label: 'var(--c-gray-600)', badge: 'badge-gray' },
    };

    const s = styles[action.action] || styles.MAINTAIN;

    return (
        <div
            className="animate-fade-in"
            style={{
                background: s.bg,
                borderLeft: `3px solid ${s.border}`,
                borderRadius: '0 8px 8px 0',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                transition: 'all 150ms',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`badge ${s.badge}`} style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
                        {action.action}
                    </span>
                    <span className={`badge badge-${action.channel === 'Meta' ? 'blue' : action.channel === 'Google' ? 'amber' : 'pink'}`}>
                        {action.channel}
                    </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-gray-900)', marginBottom: 2 }}>
                    {action.campaignName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-gray-500)' }}>{action.reason}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: s.label, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(action.currentSpend)} → {formatCurrency(action.recommendedSpend)}
                    {action.impact && ` · ${action.impact}`}
                </div>
            </div>
            {action.action !== 'MAINTAIN' && (
                <button
                    className={`btn btn-sm ${action.action === 'PAUSE' ? 'btn-danger' : action.action === 'SCALE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onExecute(action)}
                    disabled={executing}
                    style={{ flexShrink: 0 }}
                >
                    {executing ? 'Running...' : 'Execute'}
                </button>
            )}
        </div>
    );
}
