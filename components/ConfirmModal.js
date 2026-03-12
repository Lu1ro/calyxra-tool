// components/ConfirmModal.js
// Reusable confirmation dialog — used for dangerous actions (pause campaign, etc.)

export default function ConfirmModal({ title, message, details, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }}>
            <div
                className="animate-fade-in card"
                style={{ maxWidth: 480, width: '90%', padding: 'var(--space-8)' }}
            >
                <h3 style={{
                    fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)',
                    margin: '0 0 var(--space-3)', color: 'var(--c-gray-900)',
                }}>
                    {title}
                </h3>
                <p style={{
                    color: 'var(--c-gray-500)', fontSize: 'var(--text-md)',
                    whiteSpace: 'pre-line', margin: '0 0 var(--space-4)',
                    lineHeight: 1.5,
                }}>
                    {message}
                </p>
                {details && (
                    <div style={{
                        background: 'var(--c-gray-50)', padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
                        color: 'var(--c-gray-600)', whiteSpace: 'pre-line',
                        marginBottom: 'var(--space-5)', fontFamily: 'monospace',
                        border: '1px solid var(--c-gray-200)',
                    }}>
                        {details}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
