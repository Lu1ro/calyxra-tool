// components/KPICard.js
// Reusable KPI metric card with color accent

export default function KPICard({ label, value, subtitle, color, accentBorder = false, dark = false }) {
    return (
        <div
            className="card animate-fade-in"
            style={{
                borderTop: accentBorder ? `3px solid ${color || 'var(--c-green)'}` : undefined,
                background: dark ? 'var(--c-gray-900)' : 'var(--c-white)',
            }}
        >
            <div style={{
                fontSize: 'var(--text-sm)',
                color: dark ? 'var(--c-gray-400)' : 'var(--c-gray-500)',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 'var(--space-2)',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: dark ? '#fff' : (color || 'var(--c-gray-900)'),
            }}>
                {value}
            </div>
            {subtitle && (
                <div style={{
                    fontSize: 'var(--text-md)',
                    color: dark ? 'var(--c-gray-200)' : (color || 'var(--c-gray-500)'),
                    marginTop: 'var(--space-1)',
                }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}
