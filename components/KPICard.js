// components/KPICard.js
// Reusable KPI metric card with tooltip support
import { useState } from 'react';

export default function KPICard({ label, value, subtitle, color, tint, icon, tooltip }) {
    const [showTip, setShowTip] = useState(false);
    const bgTint = tint || 'transparent';
    return (
        <div
            className="card animate-fade-in"
            style={{
                background: bgTint === 'transparent' ? '#fff' : bgTint,
                position: 'relative',
                overflow: 'visible',
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                }}>
                    {label}
                    {tooltip && (
                        <span
                            onMouseEnter={() => setShowTip(true)}
                            onMouseLeave={() => setShowTip(false)}
                            style={{
                                width: 15, height: 15, borderRadius: '50%',
                                background: 'var(--c-gray-200)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 700, color: 'var(--c-gray-500)',
                                cursor: 'help', flexShrink: 0, position: 'relative',
                                textTransform: 'none', letterSpacing: 0,
                            }}
                        >
                            ?
                            {showTip && (
                                <span style={{
                                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                                    marginBottom: 6, padding: '8px 12px', borderRadius: 8,
                                    background: '#1f2937', color: '#f9fafb', fontSize: 12, fontWeight: 400,
                                    lineHeight: 1.4, whiteSpace: 'normal', width: 220,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50,
                                    textTransform: 'none', letterSpacing: 0,
                                }}>
                                    {tooltip}
                                </span>
                            )}
                        </span>
                    )}
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
