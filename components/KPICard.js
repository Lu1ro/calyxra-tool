// components/KPICard.js
// Reusable KPI metric card with modern design

export default function KPICard({ label, value, subtitle, color, tint, icon }) {
    const bgTint = tint || 'transparent';
    return (
        <div
            className="card animate-fade-in"
            style={{
                background: bgTint === 'transparent' ? '#fff' : bgTint,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                    fontSize: 11,
                    color: 'var(--c-gray-500)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 8,
                }}>
                    {label}
                </div>
                {icon && (
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: color ? `${color}15` : 'var(--c-gray-100)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <span style={{ color: color || 'var(--c-gray-500)', display: 'flex' }}>{icon}</span>
                    </div>
                )}
            </div>
            <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: color || 'var(--c-gray-900)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
            }}>
                {value}
            </div>
            {subtitle && (
                <div style={{
                    fontSize: 13,
                    color: 'var(--c-gray-500)',
                    marginTop: 4,
                }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}
