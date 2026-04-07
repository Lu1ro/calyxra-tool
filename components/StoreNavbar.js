// components/StoreNavbar.js
// Shared sub-navigation for store detail pages — clean tab bar design
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function StoreNavbar({ store, storeId, currentPage }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { data: session } = useSession();
    const tier = session?.user?.tier || 'free';

    const allNavItems = [
        { href: `/dashboard/stores/${storeId}`, label: 'Overview', minTier: 'free', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
        { href: `/dashboard/stores/${storeId}/profit`, label: 'Profit Recon', minTier: 'paid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
        { href: `/dashboard/stores/${storeId}/customers`, label: 'Cust. Quality', minTier: 'paid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
        { href: `/dashboard/stores/${storeId}/ltv`, label: 'LTV ROAS', minTier: 'paid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
        { href: `/dashboard/stores/${storeId}/analytics`, label: 'BI Dashboards', minTier: 'paid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg> },
        { href: `/dashboard/stores/${storeId}/settings`, label: 'Settings', minTier: 'free', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9"/></svg> },
    ];

    const tierRank = { free: 0, paid: 1, agency: 2 };
    const navItems = allNavItems.map(item => ({
        ...item,
        locked: tierRank[tier] < tierRank[item.minTier],
    }));

    const isActive = (href) => {
        if (href === `/dashboard/stores/${storeId}`) {
            return currentPage === href;
        }
        return currentPage?.startsWith(href);
    };

    return (
        <>
            <style>{`
                .store-subnav {
                    background: var(--c-white);
                    border-bottom: 1px solid var(--c-gray-200);
                    padding: 0 var(--space-6);
                    display: flex;
                    align-items: center;
                    gap: var(--space-6);
                    min-height: 52px;
                }
                .store-subnav-left {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    flex-shrink: 0;
                    padding: var(--space-2) 0;
                }
                .store-subnav-back {
                    color: var(--c-gray-400);
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 500;
                    transition: color 150ms;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .store-subnav-back:hover { color: var(--c-gray-700); }
                .store-subnav-sep {
                    width: 1px;
                    height: 20px;
                    background: var(--c-gray-200);
                }
                .store-subnav-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--c-gray-900);
                    letter-spacing: -0.01em;
                }
                .store-subnav-tabs {
                    display: flex;
                    align-items: center;
                    gap: 0;
                    height: 52px;
                    margin-left: auto;
                }
                .store-subnav-tab {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    height: 100%;
                    padding: 0 14px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--c-gray-500);
                    text-decoration: none;
                    border-bottom: 2px solid transparent;
                    transition: color 150ms, border-color 150ms;
                    white-space: nowrap;
                }
                .store-subnav-tab:hover {
                    color: var(--c-gray-700);
                }
                .store-subnav-tab-active {
                    color: var(--c-gray-900);
                    border-bottom-color: #064E3B;
                    font-weight: 600;
                }
                .store-subnav-tab-locked {
                    color: var(--c-gray-400) !important;
                    cursor: default;
                    position: relative;
                }
                .store-subnav-tab-locked:hover {
                    color: var(--c-gray-400) !important;
                }
                .store-subnav-lock-icon {
                    width: 10px;
                    height: 10px;
                    opacity: 0.5;
                }
                .store-subnav-tab-locked .store-subnav-tooltip {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-top: 4px;
                    padding: 8px 14px;
                    border-radius: 8px;
                    background: #1f2937;
                    color: #f9fafb;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 50;
                }
                .store-subnav-tab-locked:hover .store-subnav-tooltip {
                    display: block;
                }
                .store-subnav-badges {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .store-subnav-hamburger {
                    display: none;
                    background: none;
                    border: 1px solid var(--c-gray-200);
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 18px;
                    cursor: pointer;
                    color: var(--c-gray-500);
                    margin-left: auto;
                }
                .store-subnav-hamburger:hover { background: var(--c-gray-50); color: var(--c-gray-700); }
                .store-subnav-mobile { display: none; }
                @media (max-width: 1024px) {
                    .store-subnav { padding: 0 var(--space-4); }
                    .store-subnav-tabs { display: none !important; }
                    .store-subnav-hamburger { display: block !important; }
                    .store-subnav-mobile.open {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        background: var(--c-white);
                        padding: var(--space-2) var(--space-4);
                        border-bottom: 1px solid var(--c-gray-200);
                    }
                    .store-subnav-mobile a {
                        padding: 10px 14px !important;
                        border-radius: 8px !important;
                        font-size: 14px !important;
                        height: auto !important;
                        border-bottom: none !important;
                        color: var(--c-gray-600) !important;
                    }
                    .store-subnav-mobile a:hover { background: var(--c-gray-50) !important; }
                    .store-subnav-mobile .store-subnav-tab-active {
                        color: var(--c-gray-900) !important;
                        background: #ECFDF5 !important;
                    }
                }
            `}</style>

            <nav className="store-subnav no-print">
                <div className="store-subnav-left">
                    <a href="/dashboard" className="store-subnav-back">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        Dashboard
                    </a>
                    <div className="store-subnav-sep" />
                    <span className="store-subnav-name">{store?.name}</span>
                    <div className="store-subnav-badges">
                        {store?.connections?.map(c => (
                            <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`} style={{ gap: 4 }}>
                                <span className={`status-dot ${c.status === 'connected' ? 'status-dot-green' : 'status-dot-red'}`} style={{ width: 5, height: 5 }} />
                                {c.platform}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="store-subnav-tabs">
                    {navItems.map(item => item.locked ? (
                        <span key={item.href}
                            className="store-subnav-tab store-subnav-tab-locked"
                        >
                            {item.icon}
                            {item.label}
                            <svg className="store-subnav-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                            <span className="store-subnav-tooltip">Upgrade to Paid — $149/mo</span>
                        </span>
                    ) : (
                        <a key={item.href} href={item.href}
                            className={`store-subnav-tab ${isActive(item.href) ? 'store-subnav-tab-active' : ''}`}
                        >
                            {item.icon}
                            {item.label}
                        </a>
                    ))}
                </div>
                <button className="store-subnav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? '\u2715' : '\u2630'}
                </button>
            </nav>

            <div className={`store-subnav-mobile ${menuOpen ? 'open' : ''}`}>
                {navItems.map(item => item.locked ? (
                    <span key={item.href}
                        className="store-subnav-tab store-subnav-tab-locked"
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.icon}
                        {item.label}
                        <svg className="store-subnav-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </span>
                ) : (
                    <a key={item.href} href={item.href}
                        className={`store-subnav-tab ${isActive(item.href) ? 'store-subnav-tab-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.icon}
                        {item.label}
                    </a>
                ))}
            </div>
        </>
    );
}
