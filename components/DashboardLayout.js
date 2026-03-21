// components/DashboardLayout.js
// Shared sidebar layout for all dashboard pages
// Collapsible sidebar + top bar + content area
import Head from 'next/head';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

const TIER_LABELS = {
    free: 'FREE',
    pilot: 'PILOT',
    scale: 'SCALE',
    pro: 'PRO',
};

const TIER_COLORS = {
    free: { bg: 'rgba(255,255,255,0.08)', text: '#a0a0b8', border: 'rgba(255,255,255,0.1)' },
    pilot: { bg: 'rgba(0,184,148,0.12)', text: '#00d2a0', border: 'rgba(0,184,148,0.25)' },
    scale: { bg: 'rgba(79,70,229,0.12)', text: '#a5b4fc', border: 'rgba(79,70,229,0.25)' },
    pro: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
};

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
        exact: true,
    },
    {
        label: 'Stores',
        href: '/dashboard',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
        matchPrefix: '/dashboard/stores',
    },
    {
        label: 'Alerts',
        href: '/dashboard/alerts',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
        ),
        showBadge: true,
    },
    {
        label: 'Reports',
        href: '/dashboard',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
        comingSoon: true,
    },
    {
        label: 'Settings',
        href: '/dashboard/settings/branding',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
        ),
        matchPrefix: '/dashboard/settings',
    },
];

function isActive(item, pathname) {
    if (item.exact) return pathname === item.href;
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

    useEffect(() => {
        if (!session) return;
        fetch('/api/agency')
            .then(r => r.json())
            .then(data => setTier(data.tier || 'free'))
            .catch(() => setTier('free'));

        fetch('/api/alerts')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setAlertCount(data.length);
                else if (data.count != null) setAlertCount(data.count);
            })
            .catch(() => setAlertCount(0));
    }, [session]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [router.pathname]);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 768) setMobileOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const handleSignOut = useCallback(() => {
        signOut({ callbackUrl: '/login' });
    }, []);

    const tierKey = (tier || 'free').toLowerCase();
    const tierColor = TIER_COLORS[tierKey] || TIER_COLORS.free;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    const sidebarWidth = sidebarOpen ? 240 : 64;

    const renderSidebar = (isMobile = false) => (
        <aside
            className={`cx-sidebar ${isMobile ? 'cx-sidebar-mobile' : ''} ${!sidebarOpen && !isMobile ? 'cx-sidebar-collapsed' : ''}`}
            style={!isMobile ? { width: sidebarWidth } : undefined}
        >
            {/* Logo */}
            <div className="cx-sidebar-logo">
                <div className="cx-logo-mark">
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="#00b894" />
                        <path d="M10 16.5L14.5 21L22 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                {(sidebarOpen || isMobile) && (
                    <span className="cx-logo-text">
                        Calyx<span className="cx-logo-accent">ra</span>
                    </span>
                )}
                {!isMobile && (
                    <button
                        className="cx-sidebar-toggle"
                        onClick={() => setSidebarOpen(v => !v)}
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {sidebarOpen ? (
                                <polyline points="11 17 6 12 11 7" />
                            ) : (
                                <polyline points="13 7 18 12 13 17" />
                            )}
                        </svg>
                    </button>
                )}
                {isMobile && (
                    <button
                        className="cx-sidebar-close"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Nav section label */}
            {(sidebarOpen || isMobile) && (
                <div className="cx-nav-label">Navigation</div>
            )}

            {/* Nav items */}
            <nav className="cx-nav">
                {NAV_ITEMS.map(item => {
                    const active = isActive(item, router.pathname);
                    return (
                        <Link key={item.label} href={item.href} legacyBehavior>
                            <a className={`cx-nav-item ${active ? 'cx-nav-item-active' : ''}`} title={item.label}>
                                <span className="cx-nav-icon">{item.icon}</span>
                                {(sidebarOpen || isMobile) && (
                                    <span className="cx-nav-text">{item.label}</span>
                                )}
                                {item.showBadge && alertCount > 0 && (sidebarOpen || isMobile) && (
                                    <span className="cx-alert-badge">{alertCount > 99 ? '99+' : alertCount}</span>
                                )}
                                {item.showBadge && alertCount > 0 && !sidebarOpen && !isMobile && (
                                    <span className="cx-alert-dot" />
                                )}
                                {item.comingSoon && (sidebarOpen || isMobile) && (
                                    <span className="cx-coming-soon">Soon</span>
                                )}
                            </a>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="cx-sidebar-bottom">
                {/* Tier badge */}
                <div
                    className="cx-tier-badge"
                    style={{
                        background: tierColor.bg,
                        color: tierColor.text,
                        border: `1px solid ${tierColor.border}`,
                    }}
                >
                    {(sidebarOpen || isMobile) ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{TIER_LABELS[tierKey] || 'FREE'} Plan</span>
                        </>
                    ) : (
                        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>
                            {(TIER_LABELS[tierKey] || 'FREE').charAt(0)}
                        </span>
                    )}
                </div>

                {/* Upgrade button (free tier only) */}
                {tierKey === 'free' && (sidebarOpen || isMobile) && (
                    <a
                        href="https://calyxra.com/#pricing"
                        className="cx-upgrade-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
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
                <meta name="description" content="Calyxra — Revenue reconciliation and ad budget optimization for e-commerce" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <style jsx global>{`
                /* ─── Sidebar Layout ────────────────────────────────────── */
                .cx-layout {
                    display: flex;
                    min-height: 100vh;
                    background: var(--color-bg-secondary, #f8f9fa);
                    font-family: var(--font-sans, 'Inter', -apple-system, sans-serif);
                }

                /* ─── Sidebar ───────────────────────────────────────────── */
                .cx-sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    background: #16162a;
                    display: flex;
                    flex-direction: column;
                    z-index: 100;
                    transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    border-right: 1px solid rgba(255,255,255,0.06);
                }

                .cx-sidebar-collapsed .cx-nav-item {
                    justify-content: center;
                    padding: 10px 0;
                }

                .cx-sidebar-collapsed .cx-nav-icon {
                    margin-right: 0;
                }

                /* ─── Logo ──────────────────────────────────────────────── */
                .cx-sidebar-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 20px 16px 16px;
                    position: relative;
                    min-height: 56px;
                }

                .cx-logo-mark {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cx-logo-text {
                    font-size: 17px;
                    font-weight: 700;
                    color: #e8e8f0;
                    letter-spacing: -0.3px;
                    white-space: nowrap;
                }

                .cx-logo-accent {
                    color: var(--color-primary, #00b894);
                }

                .cx-sidebar-toggle {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.3);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 150ms, color 150ms, background 150ms;
                }

                .cx-sidebar:hover .cx-sidebar-toggle {
                    opacity: 1;
                }

                .cx-sidebar-toggle:hover {
                    background: rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.7);
                }

                .cx-sidebar-close {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                }

                /* ─── Nav ───────────────────────────────────────────────── */
                .cx-nav-label {
                    padding: 0 20px;
                    margin-bottom: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.2);
                    white-space: nowrap;
                }

                .cx-nav {
                    flex: 1;
                    padding: 0 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .cx-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 12px;
                    border-radius: 6px;
                    color: rgba(255,255,255,0.55);
                    text-decoration: none;
                    font-size: 13.5px;
                    font-weight: 500;
                    transition: all 150ms ease;
                    position: relative;
                    white-space: nowrap;
                    border-left: 2.5px solid transparent;
                    margin-left: 0;
                }

                .cx-nav-item:hover {
                    color: rgba(255,255,255,0.9);
                    background: rgba(255,255,255,0.05);
                }

                .cx-nav-item-active {
                    color: #fff;
                    background: rgba(0,184,148,0.1);
                    border-left-color: var(--color-primary, #00b894);
                }

                .cx-nav-item-active .cx-nav-icon {
                    color: var(--color-primary, #00b894);
                }

                .cx-nav-icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                }

                .cx-nav-text {
                    flex: 1;
                }

                .cx-alert-badge {
                    background: var(--color-danger, #ff6b6b);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    min-width: 18px;
                    height: 18px;
                    border-radius: 9px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 5px;
                    line-height: 1;
                }

                .cx-alert-dot {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    width: 7px;
                    height: 7px;
                    background: var(--color-danger, #ff6b6b);
                    border-radius: 50%;
                    border: 1.5px solid #16162a;
                }

                .cx-coming-soon {
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.25);
                    background: rgba(255,255,255,0.06);
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                /* ─── Sidebar Bottom ────────────────────────────────────── */
                .cx-sidebar-bottom {
                    padding: 12px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .cx-tier-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 7px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    white-space: nowrap;
                }

                .cx-upgrade-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: var(--color-primary, #00b894);
                    color: #fff;
                    font-size: 12px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: background 150ms, box-shadow 150ms;
                    white-space: nowrap;
                }

                .cx-upgrade-btn:hover {
                    background: var(--color-primary-dark, #007a65);
                    box-shadow: 0 2px 12px rgba(0,184,148,0.3);
                }

                /* ─── Main area ─────────────────────────────────────────── */
                .cx-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* ─── Top Bar ───────────────────────────────────────────── */
                .cx-topbar {
                    height: 56px;
                    background: #fff;
                    border-bottom: 1px solid var(--color-border, #dfe6e9);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    gap: 16px;
                }

                .cx-topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }

                .cx-hamburger {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--color-text, #2d3436);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                }

                .cx-hamburger:hover {
                    background: var(--c-gray-100, #f3f4f6);
                }

                .cx-search {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--c-gray-50, #f8f9fa);
                    border: 1px solid var(--color-border, #dfe6e9);
                    border-radius: 8px;
                    padding: 7px 12px;
                    max-width: 320px;
                    flex: 1;
                    color: var(--c-gray-300, #b2bec3);
                    font-size: 13px;
                    cursor: text;
                    transition: border-color 150ms;
                }

                .cx-search:hover {
                    border-color: var(--c-gray-300, #b2bec3);
                }

                .cx-search-icon {
                    flex-shrink: 0;
                    display: flex;
                }

                .cx-search-text {
                    color: var(--c-gray-300, #b2bec3);
                    user-select: none;
                }

                .cx-search-kbd {
                    margin-left: auto;
                    font-size: 10px;
                    font-weight: 600;
                    background: #fff;
                    border: 1px solid var(--color-border, #dfe6e9);
                    border-radius: 4px;
                    padding: 1px 5px;
                    color: var(--c-gray-400, #636e72);
                    font-family: var(--font-sans);
                }

                .cx-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .cx-user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .cx-avatar {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--color-primary, #00b894), var(--color-primary-dark, #007a65));
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                .cx-user-name {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--color-text, #2d3436);
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .cx-signout {
                    background: none;
                    border: 1px solid var(--color-border, #dfe6e9);
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--c-gray-500, #636e72);
                    cursor: pointer;
                    font-family: var(--font-sans);
                    transition: all 150ms;
                    white-space: nowrap;
                }

                .cx-signout:hover {
                    background: var(--c-gray-50, #f8f9fa);
                    border-color: var(--c-gray-300, #b2bec3);
                    color: var(--color-text, #2d3436);
                }

                /* ─── Content ───────────────────────────────────────────── */
                .cx-content {
                    flex: 1;
                    overflow-y: auto;
                }

                /* ─── Free tier banner ──────────────────────────────────── */
                .cx-free-banner {
                    background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
                    border-bottom: 1px solid var(--c-amber-border, #fde68a);
                    padding: 8px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    font-size: 13px;
                    color: #92400e;
                }

                .cx-free-banner a {
                    background: var(--color-primary, #00b894);
                    color: #fff;
                    padding: 5px 14px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 12px;
                    white-space: nowrap;
                    transition: background 150ms;
                    flex-shrink: 0;
                }

                .cx-free-banner a:hover {
                    background: var(--color-primary-dark, #007a65);
                }

                /* ─── Mobile overlay ────────────────────────────────────── */
                .cx-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 99;
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                }

                .cx-overlay-visible {
                    display: block;
                    animation: fadeIn 200ms ease;
                }

                .cx-sidebar-mobile {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 260px;
                    height: 100vh;
                    z-index: 200;
                    animation: sidebarSlideIn 200ms cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes sidebarSlideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }

                /* ─── Responsive ────────────────────────────────────────── */
                @media (max-width: 768px) {
                    .cx-sidebar:not(.cx-sidebar-mobile) {
                        display: none;
                    }

                    .cx-main {
                        margin-left: 0 !important;
                    }

                    .cx-hamburger {
                        display: flex;
                    }

                    .cx-search {
                        max-width: 200px;
                    }

                    .cx-search-kbd {
                        display: none;
                    }

                    .cx-user-name {
                        display: none;
                    }

                    .cx-topbar {
                        padding: 0 16px;
                    }

                    .cx-free-banner {
                        padding: 8px 16px;
                        font-size: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .cx-search {
                        display: none;
                    }
                }

                /* ─── Print ─────────────────────────────────────────────── */
                @media print {
                    .cx-sidebar,
                    .cx-topbar,
                    .cx-overlay,
                    .cx-free-banner,
                    .cx-hamburger {
                        display: none !important;
                    }
                    .cx-main {
                        margin-left: 0 !important;
                    }
                }
            `}</style>

            <div className="cx-layout">
                {/* Desktop sidebar */}
                {renderSidebar(false)}

                {/* Mobile overlay + sidebar */}
                {mobileOpen && (
                    <>
                        <div className="cx-overlay cx-overlay-visible" onClick={() => setMobileOpen(false)} />
                        {renderSidebar(true)}
                    </>
                )}

                {/* Main content */}
                <div className="cx-main" style={{ marginLeft: sidebarWidth }}>
                    {/* Top bar */}
                    <div className="cx-topbar">
                        <div className="cx-topbar-left">
                            <button
                                className="cx-hamburger"
                                onClick={() => setMobileOpen(true)}
                                aria-label="Open menu"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            </button>
                            <div className="cx-search">
                                <span className="cx-search-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </span>
                                <span className="cx-search-text">Search stores, alerts...</span>
                                <kbd className="cx-search-kbd">/</kbd>
                            </div>
                        </div>
                        <div className="cx-topbar-right">
                            <div className="cx-user-info">
                                <div className="cx-avatar">{userInitial}</div>
                                <span className="cx-user-name">{userName}</span>
                            </div>
                            <button className="cx-signout" onClick={handleSignOut}>
                                Sign out
                            </button>
                        </div>
                    </div>

                    {/* Free tier banner */}
                    {tier === 'free' && (
                        <div className="cx-free-banner">
                            <span>You&apos;re on the <strong>Free Plan</strong> &mdash; 1 store included, results locked</span>
                            <a href="https://calyxra.com/#pricing" target="_blank" rel="noopener noreferrer">
                                Upgrade &mdash; $150/mo
                            </a>
                        </div>
                    )}

                    {/* Page content */}
                    <div className="cx-content">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
