// components/StoreNavbar.js
// Shared navbar for store subpages — responsive with hamburger menu
import { useState } from 'react';

export default function StoreNavbar({ store, storeId, currentPage }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const navItems = [
        { href: `/dashboard/stores/${storeId}/profit`, label: 'Profit Recon', key: 'profit' },
        { href: `/dashboard/stores/${storeId}/customers`, label: 'Cust. Quality', key: 'customers' },
        { href: `/dashboard/stores/${storeId}/ltv`, label: 'LTV ROAS', key: 'ltv' },
        { href: `/dashboard/stores/${storeId}/analytics`, label: 'BI Dashboards', key: 'analytics' },
        { href: `/dashboard/stores/${storeId}/settings`, label: 'Settings', key: 'settings' },
    ];

    return (
        <>
            <style>{`
                .store-nav {
                    background: var(--c-white);
                    border-bottom: 1px solid var(--c-gray-200);
                    padding: 0 var(--space-8);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    min-height: 48px;
                }
                .store-nav-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-2) 0;
                }
                .store-nav-back {
                    color: var(--c-gray-400);
                    text-decoration: none;
                    font-size: var(--text-sm);
                    font-weight: 500;
                    transition: color 150ms;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .store-nav-back:hover { color: var(--c-gray-700); }
                .store-nav-divider {
                    width: 1px;
                    height: 16px;
                    background: var(--c-gray-200);
                }
                .store-nav-name {
                    font-size: var(--text-md);
                    font-weight: 600;
                    color: var(--c-gray-900);
                    letter-spacing: -0.01em;
                }
                .store-nav-tabs {
                    display: flex;
                    align-items: center;
                    gap: 0;
                    height: 48px;
                }
                .store-nav-tab {
                    display: inline-flex;
                    align-items: center;
                    height: 100%;
                    padding: 0 14px;
                    font-size: var(--text-sm);
                    font-weight: 500;
                    color: var(--c-gray-400);
                    text-decoration: none;
                    border-bottom: 2px solid transparent;
                    transition: color 200ms, border-color 200ms;
                    white-space: nowrap;
                }
                .store-nav-tab:hover {
                    color: var(--c-gray-700);
                }
                .store-nav-tab-active {
                    color: var(--c-gray-900);
                    border-bottom-color: var(--color-primary);
                }
                .store-nav-badges {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }
                .store-hamburger {
                    display: none;
                    background: none;
                    border: 1px solid var(--c-gray-200);
                    border-radius: var(--radius-md);
                    padding: 4px 10px;
                    font-size: 18px;
                    cursor: pointer;
                    color: var(--c-gray-500);
                    transition: all var(--transition-fast);
                }
                .store-hamburger:hover { background: var(--c-gray-50); color: var(--c-gray-700); }
                .store-mobile-menu { display: none; }
                @media (max-width: 1024px) {
                    .store-nav { padding: 0 var(--space-4); }
                    .store-nav-tabs { display: none !important; }
                    .store-hamburger { display: block !important; }
                    .store-mobile-menu.open {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        background: var(--c-white);
                        padding: var(--space-2) var(--space-4);
                        border-bottom: 1px solid var(--c-gray-200);
                    }
                    .store-mobile-menu a {
                        padding: 10px 14px !important;
                        border-radius: var(--radius-lg) !important;
                        font-size: var(--text-md) !important;
                        height: auto !important;
                        border-bottom: none !important;
                        color: var(--c-gray-600) !important;
                    }
                    .store-mobile-menu a:hover { background: var(--c-gray-50) !important; }
                    .store-mobile-menu .store-nav-tab-active {
                        color: var(--c-gray-900) !important;
                        background: var(--c-green-light) !important;
                    }
                }
            `}</style>

            <nav className="store-nav no-print">
                <div className="store-nav-header">
                    <a href="/dashboard" className="store-nav-back">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        Back
                    </a>
                    <div className="store-nav-divider" />
                    <span className="store-nav-name">{store?.name}</span>
                    <div className="store-nav-badges">
                        {store?.connections?.map(c => (
                            <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`}>
                                {c.platform}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="store-nav-tabs">
                    {navItems.map(item => (
                        <a key={item.href} href={item.href}
                            className={`store-nav-tab ${currentPage === item.href ? 'store-nav-tab-active' : ''}`}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
                <button className="store-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? '\u2715' : '\u2630'}
                </button>
            </nav>

            <div className={`store-mobile-menu ${menuOpen ? 'open' : ''}`}>
                {navItems.map(item => (
                    <a key={item.href} href={item.href}
                        className={`store-nav-tab ${currentPage === item.href ? 'store-nav-tab-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </>
    );
}
