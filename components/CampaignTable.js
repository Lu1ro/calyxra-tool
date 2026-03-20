// components/CampaignTable.js
// Sortable campaign breakdown table with flag-color indicators

export default function CampaignTable({ campaigns, searchQuery, onSearchChange, formatCurrency }) {
    const flagEmoji = (color) => color === 'red' ? '🔴' : color === 'amber' ? '🟡' : '🟢';

    return (
        <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
                    🎯 Campaign Breakdown
                </h3>
                <input
                    className="input input-sm"
                    type="text"
                    placeholder="🔍 Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ width: 200 }}
                />
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-base)' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--c-gray-200)', textAlign: 'left' }}>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)' }}>Campaign</th>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)' }}>Channel</th>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)', textAlign: 'right' }}>Spend</th>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)', textAlign: 'right' }}>Reported ROAS</th>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)', textAlign: 'right' }}>True ROAS</th>
                            <th style={{ padding: '10px', color: 'var(--c-gray-500)', textAlign: 'center' }}>Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={i} style={{
                                borderBottom: '1px solid var(--c-gray-100)',
                                transition: 'background var(--transition-fast)',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '10px', fontWeight: 500, maxWidth: 200 }}>
                                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.campaignName}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <span className={`badge badge-${c.channel === 'Meta' ? 'blue' : c.channel === 'Google' ? 'amber' : 'pink'}`}>
                                        {c.channel}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--c-gray-500)' }}>
                                    {formatCurrency(c.spend)}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--c-gray-500)' }}>
                                    {c.reportedRoas}×
                                </td>
                                <td style={{
                                    padding: '10px', textAlign: 'right', fontWeight: 700,
                                    color: c.estimatedTrueRoas >= 2 ? 'var(--c-green)' : c.estimatedTrueRoas >= 1 ? 'var(--c-amber)' : 'var(--c-red)',
                                }}>
                                    {c.estimatedTrueRoas}×
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                    {flagEmoji(c.flagColor)}
                                    <span className="text-xs text-muted" style={{ display: 'block' }}>{c.flag}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {campaigns.length === 0 && (
                <p className="text-muted text-md" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    No campaigns match your search.
                </p>
            )}
        </div>
    );
}
