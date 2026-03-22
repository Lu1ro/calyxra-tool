// components/DashboardLayout.js
// Shared sidebar layout for all dashboard pages
import Head from 'next/head';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';

const TIER_LABELS = { free: 'FREE', pilot: 'PILOT', scale: 'SCALE', pro: 'PRO' };

const TIER_COLORS = {
    free: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
    pilot: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', border: 'rgba(16,185,129,0.2)' },
    scale: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
    pro: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
};

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
        matchPrefix: '/dashboard',
        exact: true,
    },
    {
        label: 'Stores',
        href: '/dashboard',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
        matchStores: true,
    },
    {
        label: 'Alerts',
        href: '/dashboard/alerts',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
        showBadge: true,
    },
    {
        label: 'Settings',
        href: '/dashboard/settings/branding',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
        matchPrefix: '/dashboard/settings',
    },
];

function isActive(item, pathname) {
    if (item.exact) return pathname === item.href;
    if (item.matchStores) return pathname.startsWith('/dashboard/stores');
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.href;
}

export default function DashboardLayout({ title, children }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [tier, setTier] = useState(null);
    const [alertCount, setAlertCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        if (!session) return;
        fetch('/api/agency').then(r => r.json()).then(data => setTier(data.tier || 'free')).catch(() => setTier('free'));
        fetch('/api/alerts').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setAlertCount(data.length);
            else if (data.count != null) setAlertCount(data.count);
            else if (data.unresolvedCount != null) setAlertCount(data.unresolvedCount);
        }).catch(() => setAlertCount(0));
    }, [session]);

    useEffect(() => { setMobileOpen(false); }, [router.pathname]);

    useEffect(() => {
        const onResize = () => { if (window.innerWidth > 768) setMobileOpen(false); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // "/" keyboard shortcut for search
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'Escape' && searchFocused) {
                searchRef.current?.blur();
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [searchFocused]);

    const handleSignOut = useCallback(() => { signOut({ callbackUrl: '/login' }); }, []);

    const tierKey = (tier || 'free').toLowerCase();
    const tierColor = TIER_COLORS[tierKey] || TIER_COLORS.free;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();
    const sidebarWidth = sidebarOpen ? 240 : 64;

    const renderSidebar = (isMobile = false) => (
        <aside className={`cx-sidebar ${isMobile ? 'cx-sidebar-mobile' : ''} ${!sidebarOpen && !isMobile ? 'cx-sidebar-collapsed' : ''}`} style={!isMobile ? { width: sidebarWidth } : undefined}>
            {/* Logo */}
            <div className="cx-sidebar-logo">
                <div className="cx-logo-mark">
                    <img src="/logo.png" alt="Calyxra" width="28" height="28" style={{ borderRadius: 6 }} />
                </div>
                {(sidebarOpen || isMobile) && (
                    <span className="cx-logo-text">Calyx<span className="cx-logo-accent">ra</span></span>
                )}
                {!isMobile && (
                    <button className="cx-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? 'Collapse' : 'Expand'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {sidebarOpen ? <polyline points="11 17 6 12 11 7" /> : <polyline points="13 7 18 12 13 17" />}
                        </svg>
                    </button>
                )}
                {isMobile && (
                    <button className="cx-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className="cx-nav" style={{ marginTop: 4 }}>
                {NAV_ITEMS.map(item => {
                    const active = isActive(item, router.pathname);
                    return (
                        <Link key={item.label} href={item.href} legacyBehavior>
                            <a className={`cx-nav-item ${active ? 'cx-nav-item-active' : ''}`} title={item.label}>
                                <span className="cx-nav-icon">{item.icon}</span>
                                {(sidebarOpen || isMobile) && <span className="cx-nav-text">{item.label}</span>}
                                {item.showBadge && alertCount > 0 && (sidebarOpen || isMobile) && (
                                    <span className="cx-alert-badge">{alertCount > 99 ? '99+' : alertCount}</span>
                                )}
                                {item.showBadge && alertCount > 0 && !sidebarOpen && !isMobile && <span className="cx-alert-dot" />}
                            </a>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="cx-sidebar-bottom">
                <div className="cx-tier-badge" style={{ background: tierColor.bg, color: tierColor.text, border: `1px solid ${tierColor.border}` }}>
                    {(sidebarOpen || isMobile) ? (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            <span>{TIER_LABELS[tierKey] || 'FREE'} Plan</span>
                        </>
                    ) : (
                        <span style={{ fontSize: '9px', fontWeight: 700 }}>{(TIER_LABELS[tierKey] || 'FREE').charAt(0)}</span>
                    )}
                </div>
                {tierKey === 'free' && (sidebarOpen || isMobile) && (
                    <a href="https://calyxra.com/#pricing" className="cx-upgrade-btn" target="_blank" rel="noopener noreferrer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                        Upgrade
                    </a>
                )}
            </div>
        </aside>
    );

    return (
        <>
            <Head>
                <title>{title || 'Calyxra Dashboard'}</title>
                <meta name="description" content="Calyxra — Revenue reconciliation for e-commerce" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" type="image/png" href="/logo.png" />
                <link rel="apple-touch-icon" href="/logo.png" />
            </Head>

            <style jsx global>{`
                .cx-layout { display: flex; min-height: 100vh; background: var(--color-bg-secondary, #fafaf9); font-family: var(--font-sans, 'Inter', -apple-system, sans-serif); }

                /* ─── Sidebar ─── */
                .cx-sidebar {
                    position: fixed; top: 0; left: 0; height: 100vh;
                    background: #fff;
                    display: flex; flex-direction: column; z-index: 100;
                    transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    border-right: 1px solid #e2e8f0;
                }
                .cx-sidebar-collapsed .cx-nav-item { justify-content: center; padding: 10px 0; }
                .cx-sidebar-collapsed .cx-nav-icon { margin-right: 0; }

                /* ─── Logo ─── */
                .cx-sidebar-logo {
                    display: flex; align-items: center; gap: 10px;
                    padding: 20px 16px 16px; position: relative; min-height: 56px;
                    border-bottom: 1px solid #f1f5f9; margin-bottom: 8px;
                }
                .cx-logo-mark { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
                .cx-logo-text { font-size: 17px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px; white-space: nowrap; }
                .cx-logo-accent { color: #10b981; }

                .cx-sidebar-toggle {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    background: transparent; border: none; color: #94a3b8;
                    cursor: pointer; padding: 6px; border-radius: 6px; display: flex;
                    align-items: center; justify-content: center; opacity: 0;
                    transition: opacity 200ms, color 200ms, background 200ms;
                }
                .cx-sidebar:hover .cx-sidebar-toggle { opacity: 1; }
                .cx-sidebar-toggle:hover { background: #f1f5f9; color: #64748b; }

                .cx-sidebar-close {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    background: transparent; border: none; color: #94a3b8;
                    cursor: pointer; padding: 4px; display: flex; border-radius: 6px;
                    transition: color 150ms, background 150ms;
                }
                .cx-sidebar-close:hover { background: #f1f5f9; color: #475569; }

                /* ─── Nav ─── */
                .cx-nav { flex: 1; padding: 0 8px; display: flex; flex-direction: column; gap: 2px; }
                .cx-nav-item {
                    display: flex; align-items: center; gap: 10px; padding: 9px 12px;
                    border-radius: 8px; color: #64748b; text-decoration: none;
                    font-size: 13.5px; font-weight: 500; transition: all 150ms ease;
                    position: relative; white-space: nowrap;
                }
                .cx-nav-item:hover { color: #1e293b; background: #f8fafc; }
                .cx-nav-item-active {
                    color: #166534; background: #f0fdf4;
                    border-left: 3px solid #10b981; margin-left: -3px;
                }
                .cx-nav-item-active .cx-nav-icon { color: #10b981; }
                .cx-nav-icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; transition: color 200ms; }
                .cx-nav-text { flex: 1; }
                .cx-alert-badge {
                    background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
                    min-width: 18px; height: 18px; border-radius: 9px;
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 0 5px; line-height: 1;
                }
                .cx-alert-dot {
                    position: absolute; top: 8px; right: 10px; width: 7px; height: 7px;
                    background: #ef4444; border-radius: 50%; border: 1.5px solid #fff;
                }
                /* ─── Sidebar Bottom ─── */
                .cx-sidebar-bottom { padding: 12px 8px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 6px; }
                .cx-tier-badge {
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    padding: 7px 10px; border-radius: 8px; font-size: 10.5px; font-weight: 700;
                    letter-spacing: 0.8px; white-space: nowrap;
                }
                .cx-upgrade-btn {
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    padding: 8px 12px; border-radius: 8px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #fff; font-size: 12px; font-weight: 600; text-decoration: none;
                    transition: all 200ms; white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(16,185,129,0.25);
                }
                .cx-upgrade-btn:hover {
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    box-shadow: 0 4px 16px rgba(16,185,129,0.35);
                    transform: translateY(-1px);
                }

                /* ─── Main area ─── */
                .cx-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1); }

                /* ─── Top Bar ─── */
                .cx-topbar {
                    height: 56px; background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid var(--color-border, #e2e8f0);
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 24px; position: sticky; top: 0; z-index: 50; gap: 16px;
                }
                .cx-topbar-left { display: flex; align-items: center; gap: 12px; flex: 1; }
                .cx-hamburger { display: none; background: none; border: none; color: var(--color-text, #1e293b); cursor: pointer; padding: 4px; border-radius: 6px; }
                .cx-hamburger:hover { background: var(--c-gray-100, #f1f5f9); }

                /* ─── Search ─── */
                .cx-search {
                    display: flex; align-items: center; gap: 8px;
                    background: var(--c-gray-50, #f8fafc); border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 8px; padding: 7px 12px; max-width: 320px; flex: 1;
                    transition: border-color 200ms, box-shadow 200ms, background 200ms;
                }
                .cx-search:focus-within {
                    border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
                    background: #fff;
                }
                .cx-search-input {
                    border: none; outline: none; background: transparent; flex: 1;
                    font-size: 13px; font-family: var(--font-sans); color: var(--c-gray-800, #1e293b);
                }
                .cx-search-input::placeholder { color: var(--c-gray-400, #94a3b8); }
                .cx-search-icon { flex-shrink: 0; display: flex; color: var(--c-gray-400, #94a3b8); }
                .cx-search-kbd {
                    margin-left: auto; font-size: 10px; font-weight: 600;
                    background: #fff; border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 4px; padding: 1px 5px; color: var(--c-gray-400, #94a3b8);
                    font-family: var(--font-sans);
                }

                .cx-topbar-right { display: flex; align-items: center; gap: 12px; }
                .cx-user-info { display: flex; align-items: center; gap: 8px; }
                .cx-avatar {
                    width: 30px; height: 30px; border-radius: 50%;
                    background: linear-gradient(135deg, #166534, #10b981);
                    color: #fff; display: flex; align-items: center; justify-content: center;
                    font-size: 12px; font-weight: 700; flex-shrink: 0;
                }
                .cx-user-name {
                    font-size: 13px; font-weight: 500; color: var(--color-text, #1e293b);
                    max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .cx-signout {
                    background: none; border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 500;
                    color: var(--c-gray-500, #64748b); cursor: pointer; font-family: var(--font-sans);
                    transition: all 150ms; white-space: nowrap;
                }
                .cx-signout:hover { background: var(--c-gray-50, #f8fafc); border-color: var(--c-gray-300, #cbd5e1); color: var(--color-text, #1e293b); }

                .cx-content { flex: 1; overflow-y: auto; animation: pageSlideIn 300ms cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes pageSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* ─── Free tier banner ─── */
                .cx-free-banner {
                    background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
                    border-bottom: 1px solid #fde68a; padding: 8px 24px;
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 12px; font-size: 13px; color: #92400e;
                }
                .cx-free-banner a {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #fff; padding: 5px 14px; border-radius: 6px; text-decoration: none;
                    font-weight: 600; font-size: 12px; white-space: nowrap; transition: all 150ms; flex-shrink: 0;
                }
                .cx-free-banner a:hover { opacity: 0.9; }

                /* ─── Mobile overlay ─── */
                .cx-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
                .cx-overlay-visible { display: block; animation: fadeIn 200ms ease; }
                .cx-sidebar-mobile { position: fixed; top: 0; left: 0; width: 260px; height: 100vh; z-index: 200; animation: sidebarSlideIn 200ms cubic-bezier(0.4, 0, 0.2, 1); background: #fff; }

                @keyframes sidebarSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

                /* ─── Responsive ─── */
                @media (max-width: 768px) {
                    .cx-sidebar:not(.cx-sidebar-mobile) { display: none; }
                    .cx-main { margin-left: 0 !important; }
                    .cx-hamburger { display: flex; }
                    .cx-search { max-width: 200px; }
                    .cx-search-kbd { display: none; }
                    .cx-user-name { display: none; }
                    .cx-topbar { padding: 0 16px; }
                    .cx-free-banner { padding: 8px 16px; font-size: 12px; }
                }
                @media (max-width: 480px) { .cx-search { display: none; } }

                @media print {
                    .cx-sidebar, .cx-topbar, .cx-overlay, .cx-free-banner, .cx-hamburger { display: none !important; }
                    .cx-main { margin-left: 0 !important; }
                }
            `}</style>

            <div className="cx-layout">
                {renderSidebar(false)}
                {mobileOpen && (
                    <>
                        <div className="cx-overlay cx-overlay-visible" onClick={() => setMobileOpen(false)} />
                        {renderSidebar(true)}
                    </>
                )}

                <div className="cx-main" style={{ marginLeft: sidebarWidth }}>
                    <div className="cx-topbar">
                        <div className="cx-topbar-left">
                            <button className="cx-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                            </button>
                            <div className="cx-search">
                                <span className="cx-search-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </span>
                                <input
                                    ref={searchRef}
                                    className="cx-search-input"
                                    type="text"
                                    placeholder="Search stores, alerts..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                />
                                {!searchFocused && !searchQuery && <kbd className="cx-search-kbd">/</kbd>}
                            </div>
                        </div>
                        <div className="cx-topbar-right">
                            <div className="cx-user-info">
                                <div className="cx-avatar">{userInitial}</div>
                                <span className="cx-user-name">{userName}</span>
                            </div>
                            <button className="cx-signout" onClick={handleSignOut}>Sign out</button>
                        </div>
                    </div>

                    {tier === 'free' && (
                        <div className="cx-free-banner">
                            <span>You&apos;re on the <strong>Free Plan</strong> &mdash; 1 store, results locked</span>
                            <a href="https://calyxra.com/#pricing" target="_blank" rel="noopener noreferrer">Upgrade &mdash; $150/mo</a>
                        </div>
                    )}

                    <div className="cx-content">{children}</div>
                </div>
            </div>
        </>
    );
}
