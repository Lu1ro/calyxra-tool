// components/StoreNavbar.js
// Shared navbar for store subpages — responsive with hamburger menu
import { useState } from 'react';

export default function StoreNavbar({ store, storeId, currentPage }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const navItems = [
        { href: `/dashboard/stores/${storeId}/profit`, label: '📊 Profit Recon', cls: 'nav-pill-green' },
        { href: `/dashboard/stores/${storeId}/customers`, label: '👥 Cust. Quality', cls: 'nav-pill-pink' },
        { href: `/dashboard/stores/${storeId}/ltv`, label: '💰 LTV ROAS', cls: 'nav-pill-amber' },
        { href: `/dashboard/stores/${storeId}/analytics`, label: '📈 BI Dashboards', cls: 'nav-pill-indigo' },
        { href: `/dashboard/stores/${storeId}/database`, label: '🗄️ Database', cls: 'nav-pill-gray' },
        { href: `/dashboard/stores/${storeId}/settings`, label: '⚙️ Settings', cls: 'nav-pill-gray' },
    ];

    return (
        <>
            <style>{`
                .store-nav { background: var(--c-white); border-bottom: 1px solid var(--c-gray-200); padding: var(--space-3) var(--space-8); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
                .store-nav-links { display: flex; align-items: center; gap: var(--space-2); }
                .store-hamburger { display: none; background: none; border: 1px solid var(--c-gray-200); border-radius: var(--radius-md); padding: 4px 10px; font-size: 20px; cursor: pointer; color: var(--c-gray-700); transition: all var(--transition-fast); }
                .store-hamburger:hover { background: var(--c-gray-100); }
                .store-mobile-menu { display: none; }
                @media (max-width: 1024px) {
                    .store-nav-links { display: none !important; }
                    .store-hamburger { display: block !important; }
                    .store-mobile-menu.open { display: flex; flex-direction: column; gap: 6px; background: var(--c-white); padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--c-gray-200); }
                    .store-mobile-menu a { padding: 10px 14px !important; border-radius: var(--radius-lg) !important; font-size: var(--text-base) !important; }
                }
            `}</style>

            <nav className="store-nav no-print">
                <div className="flex-gap-3">
                    <a href="/dashboard" style={{ color: 'var(--c-gray-500)', fontSize: 'var(--text-md)' }}>← Dashboard</a>
                    <span style={{ color: 'var(--c-gray-300)' }}>|</span>
                    <img src="/logo.png" alt="Calyxra" style={{ height: 24 }} />
                    <span className="font-semibold" style={{ color: 'var(--c-gray-900)' }}>{store?.name}</span>
                </div>
                <div className="flex-gap-2">
                    {store?.connections?.map(c => (
                        <span key={c.id} className={`badge ${c.status === 'connected' ? 'badge-green' : 'badge-red'}`}>
                            {c.platform}
                        </span>
                    ))}
                    <button className="store-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
                <div className="store-nav-links">
                    <span style={{ color: 'var(--c-gray-200)', margin: '0 4px' }}>|</span>
                    {navItems.map(item => (
                        <a key={item.href} href={item.href}
                            className={`nav-pill ${item.cls}`}
                            style={{ opacity: currentPage === item.href ? 1 : 0.85 }}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            </nav>

            <div className={`store-mobile-menu ${menuOpen ? 'open' : ''}`}>
                {navItems.map(item => (
                    <a key={item.href} href={item.href}
                        className={`nav-pill ${item.cls}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </>
    );
}
