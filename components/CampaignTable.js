// components/CampaignTable.js
// Sortable campaign breakdown table with status dot indicators

export default function CampaignTable({ campaigns, searchQuery, onSearchChange, formatCurrency }) {
    return (
        <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--c-gray-900)', letterSpacing: '-0.01em' }}>
                    Campaign Breakdown
                </h3>
                <div style={{ position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-gray-400)" strokeWidth="2"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        className="input"
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{ width: 200, fontSize: 13, paddingLeft: 32, height: 34 }}
                    />
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Campaign</th>
                            <th>Channel</th>
                            <th style={{ textAlign: 'right' }}>Spend</th>
                            <th style={{ textAlign: 'right' }}>Reported ROAS</th>
                            <th style={{ textAlign: 'right' }}>True ROAS</th>
                            <th style={{ textAlign: 'center' }}>Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 500, maxWidth: 200 }}>
                                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.campaignName}
                                    </span>
                                </td>
                                <td>
                                    <span className="badge badge-blue">
                                        {c.channel}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatCurrency(c.spend)}
                                </td>
                                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {c.reportedRoas}×
                                </td>
                                <td style={{
                                    textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                    color: c.estimatedTrueRoas >= 2 ? '#043927' : c.estimatedTrueRoas >= 1 ? '#b45309' : '#dc2626',
                                }}>
                                    {c.estimatedTrueRoas}×
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <span className={`status-dot status-dot-${c.flagColor === 'red' ? 'red' : c.flagColor === 'amber' ? 'amber' : 'green'}`} />
                                        <span style={{ fontSize: 11, color: 'var(--c-gray-400)' }}>{c.flag}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {campaigns.length === 0 && (
                <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--c-gray-400)', fontSize: 14 }}>
                    No campaigns match your search.
                </p>
            )}
        </div>
    );
}
