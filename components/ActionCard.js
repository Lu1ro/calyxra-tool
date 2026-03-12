// components/ActionCard.js
// Single optimizer action recommendation card

export default function ActionCard({ action, onExecute, executing, formatCurrency }) {
    const colors = {
        PAUSE: { bg: 'var(--c-red-light)', border: 'var(--c-red-border)', color: 'var(--c-red)', emoji: '⏸️' },
        REDUCE: { bg: 'var(--c-amber-light)', border: 'var(--c-amber-border)', color: '#92400e', emoji: '📉' },
        SCALE: { bg: 'var(--c-green-bg)', border: 'var(--c-green-border)', color: 'var(--c-green)', emoji: '📈' },
        MAINTAIN: { bg: 'var(--c-gray-50)', border: 'var(--c-gray-200)', color: 'var(--c-gray-600)', emoji: '✅' },
    };

    const style = colors[action.action] || colors.MAINTAIN;

    return (
        <div
            className="animate-fade-in"
            style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-4)',
                transition: 'all var(--transition-fast)',
            }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex-gap-2" style={{ marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: style.color }}>
                        {style.emoji} {action.action}
                    </span>
                    <span className={`badge badge-${action.channel === 'Meta' ? 'blue' : 'amber'}`}>
                        {action.channel}
                    </span>
                </div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--c-gray-900)', marginBottom: 2 }}>
                    {action.campaignName}
                </div>
                <div className="text-sm text-muted">{action.reason}</div>
                <div className="text-xs" style={{ marginTop: 'var(--space-1)', color: style.color }}>
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
                    {executing ? '⏳' : 'Execute'}
                </button>
            )}
        </div>
    );
}
